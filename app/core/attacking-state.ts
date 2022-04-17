import { CLIMATE, ITEM } from '../models/enum';
import { Orientation, AttackType } from '../types/enum/Game';
import { Effect } from '../types/enum/Effect';
import Board from './board';
import PokemonEntity from './pokemon-entity';
import PokemonState from './pokemon-state';
import { PokemonActionState } from '../types/enum/Game';

export default class AttackingState extends PokemonState {

  update(pokemon: PokemonEntity, dt: number, board: Board, climate: string): boolean {
    super.update(pokemon, dt, board, climate);
    if (pokemon.cooldown <= 0) {
      pokemon.cooldown = pokemon.getAttackDelay();
      const targetCoordinate = this.getNearestTargetCoordinate(pokemon, board);
      // no target case
      if (targetCoordinate[0] === undefined || targetCoordinate[1] === undefined) {
        pokemon.toMovingState();
      } else if (board.distance(pokemon.positionX, pokemon.positionY, targetCoordinate[0], targetCoordinate[1]) > pokemon.range) {
        pokemon.toMovingState();
      } else if (pokemon.status.confusion) {
        pokemon.toMovingState();
      } else {
        this.attack(pokemon, board, targetCoordinate, climate);
        if (pokemon.effects.includes(Effect.EERIE_IMPULSE) || pokemon.effects.includes(Effect.RISING_VOLTAGE) || pokemon.effects.includes(Effect.OVERDRIVE)) {
          let doubleAttackChance = 0;
          if (pokemon.effects.includes(Effect.EERIE_IMPULSE)) {
            doubleAttackChance = 0.2;
          } else if (pokemon.effects.includes(Effect.RISING_VOLTAGE)) {
            doubleAttackChance = 0.4;
          } else if (pokemon.effects.includes(Effect.OVERDRIVE)) {
            doubleAttackChance = 0.6;
          }
          if (Math.random() < doubleAttackChance) {
            pokemon.count.doubleAttackCount ++;
            this.attack(pokemon, board, targetCoordinate, climate);
            this.attack(pokemon, board, targetCoordinate, climate);
          }
        }
      }
    } else {
      pokemon.cooldown = Math.max(0, pokemon.cooldown - dt);
    }
    return false;
  }

  attack(pokemon: PokemonEntity, board: Board, coordinates: number[], climate: string) {
    pokemon.count.attackCount ++;
    pokemon.targetX = coordinates[0];
    pokemon.targetY = coordinates[1];
    const target = board.getValue(coordinates[0], coordinates[1]);
    if (target && !pokemon.status.sleep && !pokemon.status.freeze) {
      if (pokemon.items.has(ITEM.UPGRADE)) {
        pokemon.handleAttackSpeed(6);
      }

      if (climate == CLIMATE.SNOW) {
        let freezeChance = 0;
        if (pokemon.effects.includes(Effect.SNOW)) {
          freezeChance += 0.1;
        }
        if (pokemon.effects.includes(Effect.SHEER_COLD)) {
          freezeChance += 0.3;
        }
        if (Math.random() > 1 - freezeChance) {
          target.status.triggerFreeze(2000);
        }
      }
      let poisonChance = 0;
      if (pokemon.effects.includes(Effect.POISON_GAS)) {
        poisonChance += 0.1;
      }
      if (pokemon.effects.includes(Effect.TOXIC)) {
        poisonChance += 0.3;
      }
      if (poisonChance != 0) {
        if (Math.random() > poisonChance) {
          target.status.triggerPoison(2000, target, pokemon);
        }
      }
      if (pokemon.effects.includes(Effect.CURSE) || pokemon.effects.includes(Effect.PHANTOM_FORCE)) {
        target.status.triggerSilence(3000);
      }
      if (pokemon.effects.includes(Effect.REVENGE)) {
        pokemon.setMana(pokemon.mana + 5);
      }
      if (pokemon.effects.includes(Effect.PUNISHMENT)) {
        pokemon.setMana(pokemon.mana + 15);
      }
      pokemon.orientation = board.orientation(pokemon.positionX, pokemon.positionY, target.positionX, target.positionY);
      if (pokemon.orientation == Orientation.UNCLEAR) {
        console.log(`error orientation, was attacking, name ${pokemon.name}`);
        pokemon.orientation = Orientation.DOWNLEFT;
      }
      // console.log(`pokemon attack from (${pokemon.positionX},${pokemon.positionY}) to (${pokemon.targetX},${pokemon.targetY}), orientation: ${pokemon.orientation}`);
      let damage;
      const attackType = pokemon.attackType;

      if (Math.random() * 100 < pokemon.critChance && target && !target.items.has(ITEM.ROCKY_HELMET)) {
        if (pokemon.effects.includes(Effect.FAIRY_WIND) || pokemon.effects.includes(Effect.STRANGE_STEAM) || pokemon.effects.includes(Effect.AROMATIC_MIST)) {
          let d = 0;
          if (pokemon.effects.includes(Effect.AROMATIC_MIST)) {
            d = 15;
          } else if (pokemon.effects.includes(Effect.FAIRY_WIND)) {
            d = 30;
          } else if (pokemon.effects.includes(Effect.STRANGE_STEAM)) {
            d = 60;
          }
          const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY);

          cells.forEach((cell) => {
            if (cell.value && pokemon.team != cell.value.team) {
              cell.value.count.fairyCritCount ++;
              cell.value.handleDamage(d, board, AttackType.SPECIAL, pokemon);
            }
          });
        }
        if (target.effects.includes(Effect.FAIRY_WIND) || target.effects.includes(Effect.STRANGE_STEAM) || target.effects.includes(Effect.AROMATIC_MIST)) {
          let d = 0;
          if (target.effects.includes(Effect.AROMATIC_MIST)) {
            d = 15;
          } else if (target.effects.includes(Effect.FAIRY_WIND)) {
            d = 30;
          } else if (target.effects.includes(Effect.STRANGE_STEAM)) {
            d = 60;
          }
          const cells = board.getAdjacentCells(target.positionX, target.positionY);

          cells.forEach((cell) => {
            if (cell.value && target.team != cell.value.team) {
              cell.value.count.fairyCritCount ++;
              cell.value.handleDamage(d, board, AttackType.SPECIAL, pokemon);
            }
          });
        }
        damage = Math.round(pokemon.atk * pokemon.critDamage);
        target.count.crit ++;
      } else {
        damage = pokemon.atk;
      }

      target.handleDamage(damage, board, attackType, pokemon);

      if (pokemon.items.has(ITEM.BLUE_ORB)) {
        pokemon.count.staticHolderCount ++;
        if (pokemon.count.staticHolderCount > 3) {
          pokemon.count.staticHolderCount = 0;
          // eslint-disable-next-line no-unused-vars
          let c = 4;
          board.forEach((x, y, tg) => {
            if (tg && pokemon.team != tg.team) {
              tg.count.staticCount ++;
              tg.handleDamage(8, board, AttackType.SPECIAL, pokemon);
              c --;
            }
          });
        }
      }

      if (target && target.items.has(ITEM.SMOKE_BALL)) {
        pokemon.status.triggerSmoke(5000, pokemon);
      }

      if (target && pokemon.items.has(ITEM.RAZOR_FANG)) {
        target.status.triggerArmorReduction(5000);
      }

      if (pokemon.items.has(ITEM.CHOICE_SCARF)) {
        const cells = board.getAdjacentCells(target.positionX, target.positionY);
        let targetCount = 1;
        cells.forEach((cell) => {
          if (cell.value && pokemon.team != cell.value.team && targetCount > 0) {
            cell.value.handleDamage(Math.ceil(0.75 * damage), board, attackType, pokemon);
            targetCount --;
          }
        });
      }

      if (pokemon.items.has(ITEM.LEFTOVERS)) {
        const cells = board.getAdjacentCells(pokemon.positionX, pokemon.positionY);
        pokemon.handleHeal(3, pokemon);
        cells.forEach((cell) => {
          if (cell.value && pokemon.team == cell.value.team) {
            cell.value.handleHeal(3, pokemon);
          }
        });
      }

      if (pokemon.items.has(ITEM.MANA_SCARF)) {
        pokemon.setMana(pokemon.mana + 8);
      }
    }
  }

  onEnter(pokemon) {
    super.onEnter(pokemon);
    pokemon.action = PokemonActionState.ATTACK;
    pokemon.cooldown = 0;
  }

  onExit(pokemon) {
    pokemon.targetX = -1;
    pokemon.targetY = -1;
    super.onExit(pokemon);
  }
}

module.exports = AttackingState;