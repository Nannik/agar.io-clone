"use strict";

const util = require('../lib/util');
const { v4: uuidv4 } = require('uuid');
const {getPosition} = require("../lib/entityUtils");
const config = require("../../../config")
const gameLogic = require('../game-logic');

class Virus {
    constructor(position, mass, config, direction, speed) {
        this.id = uuidv4();
        this.x = position.x;
        this.y = position.y;
        this.radius = util.massToRadius(mass);
        this.mass = mass;
        this.fill = config.fill;
        this.stroke = config.stroke;
        this.strokeWidth = config.strokeWidth;
        this.direction = direction;
        this.speed = speed;
    }

    addMass(mass, direction) {
        let split = null
        this.mass += mass;

        if (this.mass > config.virus.maxMass) {
            this.mass = config.virus.defaultMass.from;
            split =  new Virus(
                { x: this.x, y: this.y },
                this.mass,
                config,
                direction,
                config.virus.defaultSpeed
            );
        }

        this.radius = util.massToRadius(this.mass)
        return split;
    }

    move(gameWidth, gameHeight) {
        if (this.direction && this.speed !== 0) {
            this.x += this.direction.x * this.speed;
            this.y += this.direction.y * this.speed;
            this.speed = Math.max(0, this.speed - config.virus.frictionSlowDown);

            gameLogic.adjustForBoundaries(this, this.radius, 5, gameWidth, gameHeight);
        }
    }

    isColliding(roundEntity) {
        const x1 = this.x;
        const y1 = this.y;
        const x2 = roundEntity.x;
        const y2 = roundEntity.y;
        const d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        return d < this.radius + roundEntity.radius;
    }
}

exports.VirusManager = class {
    constructor(virusConfig) {
        this.data = [];
        this.virusConfig = virusConfig;
    }

    pushNew(virus) {
        this.data.push(virus);
        console.log(virus)
    }

    addNew(number) {
        while (number--) {
            var mass = util.randomInRange(this.virusConfig.defaultMass.from, this.virusConfig.defaultMass.to);
            var radius = util.massToRadius(mass);
            var position = getPosition(this.virusConfig.uniformDisposition, radius, this.data);
            var newVirus = new Virus(position, mass, this.virusConfig);
            this.pushNew(newVirus);
        }
    }

    move(gameWidth, gameHeight) {
        for (const virus of this.data) {
            virus.move(gameWidth, gameHeight);
        }

    }

    delete(virusCollision) {
        this.data.splice(virusCollision, 1);
    }
};
