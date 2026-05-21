import redis

class CosmiconStore:
    KEY_STATE = "cosmicon_handler:game_state"
    KEY_TURNS = "cosmicon_handler:turns"

    def __init__(self, host="localhost", port=6379, db=0):
        self.client = redis.Redis(host=host, port=port, db=db, decode_responses=True)

    def initialize_game(self, starting_hp=30):
        self.client.hset(self.KEY_STATE, mapping={
            "current_turn": 1,
            "current_attacker": "Player 1",
            "current_defender": "Player 2",
            "player1_hp": starting_hp,
            "player2_hp": starting_hp,
            "last_attack": 0,
            "last_defense": 0,
            "last_total_damage": 0,
        })
        self.client.delete(self.KEY_TURNS)
        self.create_turn(1, "Player 1", "Player 2", 0, 0, 0, starting_hp, starting_hp)

    def get_game_state(self):
        state = self.client.hgetall(self.KEY_STATE)
        if not state:
            self.initialize_game()
            state = self.client.hgetall(self.KEY_STATE)
        return self._normalize_state(state)

    def set_game_state(self, current_turn, current_attacker, current_defender, player1_hp, player2_hp, last_attack=0, last_defense=0, last_total_damage=0):
        self.client.hset(self.KEY_STATE, mapping={
            "current_turn": current_turn,
            "current_attacker": current_attacker,
            "current_defender": current_defender,
            "player1_hp": player1_hp,
            "player2_hp": player2_hp,
            "last_attack": last_attack,
            "last_defense": last_defense,
            "last_total_damage": last_total_damage,
        })

    def create_turn(self, turn_number, atker, defender, atk_amount, def_amount, total_damage, player1_hp, player2_hp):
        key = self._turn_key(turn_number)
        self.client.hset(key, mapping={
            "turn_number": turn_number,
            "atker": atker,
            "defender": defender,
            "atk_amount": atk_amount,
            "def_amount": def_amount,
            "total_damage": total_damage,
            "player1_hp": player1_hp,
            "player2_hp": player2_hp,
        })
        self.client.rpush(self.KEY_TURNS, turn_number)

    def update_turn_atk(self, turn_number, atk_amount):
        self.client.hset(self._turn_key(turn_number), mapping={"atk_amount": atk_amount})

    def update_turn_def(self, turn_number, def_amount, total_damage, player1_hp, player2_hp):
        self.client.hset(self._turn_key(turn_number), mapping={
            "def_amount": def_amount,
            "total_damage": total_damage,
            "player1_hp": player1_hp,
            "player2_hp": player2_hp,
        })

    def update_turn_attack(self, turn_number, atk_amount):
        return self.update_turn_atk(turn_number, atk_amount)

    def update_turn_defense(self, turn_number, def_amount, total_damage, player1_hp, player2_hp):
        return self.update_turn_def(turn_number, def_amount, total_damage, player1_hp, player2_hp)

    def get_turn(self, turn_number):
        turn = self.client.hgetall(self._turn_key(turn_number))
        return self._normalize_turn(turn) if turn else None

    def get_turns(self):
        turn_ids = self.client.lrange(self.KEY_TURNS, 0, -1)
        return [self.get_turn(int(turn_id)) for turn_id in turn_ids]

    def _turn_key(self, turn_number):
        return f"cosmicon_handler:turn:{turn_number}"

    def _normalize_state(self, state):
        numeric_fields = ["current_turn", "player1_hp", "player2_hp", "last_attack", "last_defense", "last_total_damage"]
        for field in numeric_fields:
            if field in state:
                try:
                    state[field] = int(state[field])
                except (ValueError, TypeError):
                    state[field] = 0
        return state

    def _normalize_turn(self, turn):
        numeric_fields = ["turn_number", "atk_amount", "def_amount", "total_damage", "player1_hp", "player2_hp"]
        for field in numeric_fields:
            if field in turn:
                turn[field] = int(turn[field])
        return turn
