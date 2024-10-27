"use strict";

const util = require('../lib/util');
const gameLogic = require('../game-logic');
const sat = require('sat')

exports.MassFood = class {

    constructor(playerFiring, cellIndex, mass) {
        this.id = playerFiring.id;
        this.num = cellIndex;
        this.mass = mass;
        this.hue = playerFiring.hue;
        this.direction = new sat.Vector(
            playerFiring.x - playerFiring.cells[cellIndex].x + playerFiring.target.x,
            playerFiring.y - playerFiring.cells[cellIndex].y + playerFiring.target.y
        ).normalize()
        this.x = playerFiring.cells[cellIndex].x;
        this.y = playerFiring.cells[cellIndex].y;
        this.radius = util.massToRadius(mass);
        this.speed = 25;
    }

    move(gameWidth, gameHeight) {
        var deltaX = this.speed * this.direction.x;
        var deltaY = this.speed * this.direction.y;

        this.speed -= 0.5;
        if (this.speed < 0) {
            this.speed = 0;
        }
        if (!isNaN(deltaY)) {
            this.y += deltaY;
        }
        if (!isNaN(deltaX)) {
            this.x += deltaX;
        }

        gameLogic.adjustForBoundaries(this, this.radius, 5, gameWidth, gameHeight);
    }
}

exports.MassFoodManager = class {
    constructor() {
        this.data = [];
    }

    addNew(playerFiring, cellIndex, mass)  {
        this.data.push(new exports.MassFood(playerFiring, cellIndex, mass));
    }

    move (gameWidth, gameHeight, virusesManager) {
        const toRemove = new Set();
        const newViruses = [];
        for (let [i, currentFood] of this.data.entries()) {
            if (currentFood.speed > 0) {
                currentFood.move(gameWidth, gameHeight);

                for (let virus of virusesManager.data) {
                    if (virus.isColliding(currentFood)) {
                        toRemove.add(i);
                        const newVirus = virus.addMass(currentFood.mass, new sat.Vector(
                            virus.x - currentFood.x,
                            virus.y - currentFood.y
                        ).normalize());

                        if (newVirus !== null) {
                            newViruses.push(newVirus);
                        }
                    }
                }
            }
        }

        for (let idx of toRemove) {
            this.data.splice(idx, 1);
        }

        for (let virus of newViruses) {
            virusesManager.pushNew(virus);
        }
    }

    remove(indexes) {
        if (indexes.length > 0) {
            this.data = util.removeIndexes(this.data, indexes);
        }
    }
}
