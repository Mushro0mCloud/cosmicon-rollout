# Cosmicon: Rollout

**Welcome to Cosmicon: Rollout!**
A very simple dice game inspired by a minigame of a similar name from Honkai: Star Rail.

The repository is designed in such a way that one can immediately navigate to its folder and run a docker compose code. This allows for easy dockerization that runs the program on localhost, port 3000.

```
cd ~/cosmicon-rollout
docker compose up
```

## Rules

The attacker selects three dice from a pool. Four of these dice are d6, two are d8. The sum of the three dice is the attack number.

The defender then selects three dice from a pool. Four of these dice are d6, two are d4. The sum of the three dice is the defense number.

The amount of damage dealt to the defender is equal to the attack number minus the defense number.

Whoever reaches 0 HP first is the loser.

## Web Version

There is a web version running on [http://35.255.251.132:3000/](http://35.255.251.132:3000/), or at least there will be so long as the virtual machine is up.
