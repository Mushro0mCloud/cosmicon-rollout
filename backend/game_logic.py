import random


class GameLogic:
    def __init__(self, store, connected_players, temporary_rolls, publish_game_event):
        self.store = store
        self.connected_players = connected_players
        self.temporary_rolls = temporary_rolls
        self.publish_game_event = publish_game_event

    def get_player_role(self, session_id):
        return self.connected_players.get(session_id, 'Unknown')

    def process_action(self, action):
        action_type = action.get('type')
        data = action.get('data') or {}
        session_id = data.get('session_id')

        if action_type == 'turn_change':
            self.process_turn_change()
        elif action_type == 'confirm_action':
            self.process_confirm_action(session_id)
        elif action_type == 'roll_attack':
            self.process_roll_attack(session_id)
        elif action_type == 'roll_defense':
            self.process_roll_defense(session_id)
        elif action_type == 'confirm_attack_selection':
            self.process_confirm_attack_selection(session_id, data.get('selected_indices', []))
        elif action_type == 'confirm_defense_selection':
            self.process_confirm_defense_selection(session_id, data.get('selected_indices', []))
        else:
            self.publish_game_event('error', {'message': f'Unknown action type: {action_type}'}, room=session_id)

    def process_turn_change(self):
        player_roles = self.connected_players.values()
        if 'Player 1' in player_roles and 'Player 2' in player_roles:
            game_state = self.store.get_game_state()
            next_turn = game_state['current_turn'] + 1
            current_attacker = 'Player 1' if next_turn % 2 == 1 else 'Player 2'
            current_defender = 'Player 2' if current_attacker == 'Player 1' else 'Player 1'

            self.store.create_turn(
                next_turn,
                current_attacker,
                current_defender,
                0,
                0,
                0,
                game_state['player1_hp'],
                game_state['player2_hp'],
            )
            self.store.set_game_state(
                next_turn,
                current_attacker,
                current_defender,
                game_state['player1_hp'],
                game_state['player2_hp'],
                last_attack=0,
                last_defense=0,
                last_total_damage=0,
            )

            self.publish_game_event('turn_changed', {
                'current_turn': next_turn,
                'current_player': current_attacker,
                'message': f'{current_attacker} will now attack. {current_defender} will defend.'
            })
            self.publish_game_event('game_state', self.store.get_game_state())

    def process_confirm_action(self, session_id):
        role = self.get_player_role(session_id)
        self.publish_game_event('action_confirmed', {'role': role, 'message': f'{role} has confirmed their action.'})

    def process_roll_attack(self, session_id):
        role = self.get_player_role(session_id)
        game_state = self.store.get_game_state()
        current_turn = game_state['current_turn']
        current_attacker = game_state['current_attacker']

        if role != current_attacker:
            self.publish_game_event('error', {'message': 'Only the attacking player can roll attack on this turn.'}, room=session_id)
            return

        rolls = [random.randint(1, 6) for _ in range(4)] + [random.randint(1, 8) for _ in range(2)]
        self.temporary_rolls.setdefault(current_turn, {})['attack'] = rolls

        self.publish_game_event('attack_rolled', {
            'rolls': rolls,
            'message': f'{role} rolled: {rolls}. Select up to 3 dice.',
            'current_turn': current_turn,
        })

    def process_roll_defense(self, session_id):
        role = self.get_player_role(session_id)
        game_state = self.store.get_game_state()
        current_turn = game_state['current_turn']
        current_defender = game_state['current_defender']

        if role != current_defender:
            self.publish_game_event('error', {'message': 'Only the defending player can roll defense on this turn.'}, room=session_id)
            return

        rolls = [random.randint(1, 4) for _ in range(4)] + [random.randint(1, 6) for _ in range(2)]
        self.temporary_rolls.setdefault(current_turn, {})['defense'] = rolls

        self.publish_game_event('defense_rolled', {
            'rolls': rolls,
            'message': f'{role} rolled: {rolls}. Select up to 3 dice.',
            'current_turn': current_turn,
        })

    def process_confirm_attack_selection(self, session_id, selected_indices):
        role = self.get_player_role(session_id)
        game_state = self.store.get_game_state()
        current_turn = game_state['current_turn']
        current_attacker = game_state['current_attacker']

        if role != current_attacker:
            self.publish_game_event('error', {'message': 'Only the attacking player can confirm attack selection.'}, room=session_id)
            return

        attack_rolls = self.temporary_rolls.get(current_turn, {}).get('attack', [])
        if not attack_rolls:
            self.publish_game_event('error', {'message': 'No rolls found for this turn.'}, room=session_id)
            return

        selected_rolls = [attack_rolls[i] for i in selected_indices if i < len(attack_rolls)]
        total_attack = sum(selected_rolls)

        self.store.update_turn_attack(current_turn, total_attack)
        self.store.set_game_state(
            current_turn,
            current_attacker,
            game_state['current_defender'],
            game_state['player1_hp'],
            game_state['player2_hp'],
            last_attack=total_attack,
            last_defense=game_state['last_defense'],
            last_total_damage=game_state['last_total_damage'],
        )

        self.publish_game_event('attack_selection_confirmed', {
            'total': total_attack,
            'message': f'{role} selected {selected_rolls} for {total_attack} damage.',
        })
        self.publish_game_event('game_state', self.store.get_game_state())

    def process_confirm_defense_selection(self, session_id, selected_indices):
        role = self.get_player_role(session_id)
        game_state = self.store.get_game_state()
        current_turn = game_state['current_turn']
        current_defender = game_state['current_defender']
        current_attacker = game_state['current_attacker']

        if role != current_defender:
            self.publish_game_event('error', {'message': 'Only the defending player can confirm defense selection.'}, room=session_id)
            return

        defense_rolls = self.temporary_rolls.get(current_turn, {}).get('defense', [])
        if not defense_rolls:
            self.publish_game_event('error', {'message': 'No rolls found for this turn.'}, room=session_id)
            return

        selected_rolls = [defense_rolls[i] for i in selected_indices if i < len(defense_rolls)]
        defense_total = sum(selected_rolls)
        attack_total = game_state['last_attack']
        net_damage = max(0, attack_total - defense_total)

        player1_hp = game_state['player1_hp']
        player2_hp = game_state['player2_hp']
        if current_defender == 'Player 1':
            player1_hp = max(0, player1_hp - net_damage)
        else:
            player2_hp = max(0, player2_hp - net_damage)

        self.store.update_turn_defense(current_turn, defense_total, net_damage, player1_hp, player2_hp)
        self.store.set_game_state(
            current_turn,
            current_attacker,
            current_defender,
            player1_hp,
            player2_hp,
            last_attack=attack_total,
            last_defense=defense_total,
            last_total_damage=net_damage,
        )

        self.publish_game_event('defense_selection_confirmed', {
            'total': defense_total,
            'net_damage': net_damage,
            'message': f'{role} selected {selected_rolls} for {defense_total} defense and reduced damage by {defense_total}.',
        })
        self.publish_game_event('game_state', self.store.get_game_state())

        if player1_hp <= 0 or player2_hp <= 0:
            winner = 'Player 2' if player1_hp <= 0 else 'Player 1'
            self.publish_game_event('game_over', {
                'message': f'Game over! {winner} wins.',
                'winner': winner,
            })
            return

        self.process_turn_change()
