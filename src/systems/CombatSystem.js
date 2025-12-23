export class CombatSystem {
    constructor(scene) {
        this.scene = scene;
        this.hitboxes = this.scene.physics.add.group();
        this.hurtboxes = this.scene.physics.add.group(); // Maybe not needed if using bodies directly
    }

    createHitbox(x, y, width, height, duration, damage, owner) {
        // Create a temporary zone/body for attack
        const hitbox = this.scene.add.rectangle(x, y, width, height, 0xffff00, 0.5);
        this.scene.physics.add.existing(hitbox);
        hitbox.body.setAllowGravity(false);
        hitbox.body.setImmovable(true);

        hitbox.damage = damage;
        hitbox.owner = owner; // 'player' or 'enemy'

        this.hitboxes.add(hitbox);

        // Debug visualization handled by Phaser debug or manually if needed

        this.scene.time.delayedCall(duration, () => {
            hitbox.destroy();
        });

        return hitbox;
    }

    update() {
        // Clean up inert hitboxes if needed, but delayedCall handles destroy.

        // Check Player Hitboxes vs Enemies
        this.scene.physics.overlap(this.hitboxes, this.scene.stageManager.enemies, (hitbox, enemy) => {
            if (hitbox.owner === 'player' && !enemy.isDead) {
                // Check if this hitbox already hit this enemy (prevent multi-hit per frame if needed, but destroy handles it)
                // Actually, hitbox lasts 100ms. We should only hit once.
                if (!hitbox.hasHit) {
                    hitbox.hasHit = [];
                }
                if (hitbox.hasHit.includes(enemy)) return;

                hitbox.hasHit.push(enemy);
                enemy.takeDamage(hitbox.damage, this.scene.player.x);
            }
        });

        // Check Enemy Hitboxes vs Player
        this.scene.physics.overlap(this.hitboxes, this.scene.player, (player, hitbox) => {
            if (hitbox.owner === 'enemy') {
                if (!hitbox.hasHit) {
                    hitbox.hasHit = [];
                }
                if (hitbox.hasHit.includes(player)) return;

                hitbox.hasHit.push(player);
                player.takeDamage(hitbox.damage, hitbox.x);
            }
        });
    }
}
