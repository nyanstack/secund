// Basic Math Utils to replicate Phaser.Math partially
class MathUtils {
    static Distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    static Between(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = { MathUtils };
