import "phaser";

// class Bullet extends Phaser.GameObjects.Sprite {
//   private speed: number;
//   private point: Phaser.Geom.Point;

//   constructor(scene) {
//     super(scene, 0, 0, 'bullet');
//     this.speed = Phaser.Math.GetSpeed(400, 1);

//     this.point = new Phaser.Geom.Point(0, 0);
//   }
  
//   // Pass direction to bullet as 3rd param
//   fire(shooter, direction) {
//     this.setPosition(shooter.x, shooter.y)
//       .setActive(true)
//       .setVisible(true)
      
//     this.point.setTo(0, -this.speed)
//     Phaser.Math.Rotate(this.point, direction)
//   }
  
//   update(time, delta) {
//     // Update position based on point
//     this.x += this.point.x * delta;
//     this.y += this.point.y * delta;
    
//     if (this.y < -50) {
//       this.setActive(false);
//       this.setVisible(false);
//     }
//   }
// }

export class GameScene extends Phaser.Scene {
  delta: number;
}

const config: GameConfig = {
    type: Phaser.AUTO,
  title: "Asteroids Online",
  width: 800,
  height: 600,
  parent: "game",
  backgroundColor: "#18216D",
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: "arcade",
    arcade: {
        fps: 60,
        gravity: { y: 0 }
    }
  },
};

export class AsteroidsGame extends Phaser.Game {
  constructor(config: GameConfig) {
    super(config);
  }
}

window.onload = () => {
  var game = new AsteroidsGame(config);
};

function init(params): void {
  this.delta = 1000;
}

function preload(): void {
    this.load.image("ship", 'assets/sprites/ship2.png');
    this.load.image('bullet', 'assets/sprites/bullet1.png');
  //   this.load.audio('shoot', [
  //     'assets/audio/shoot.ogg',
  //     'assets/audio/shoot.mp3'
  // ]);
}

var cursors;
var bullets;
var ship;
var lastFired;
var currentSpeed = 0;
let active = true;
let lastPositionUpdate;

function create(): void {
  // let playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
  // bullets = this.add.group({
  //   classType: Bullet,
  //   maxSize: 10,
  //   runChildUpdate: true
  // });
  // let enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });

  this.info = this.add.text(10, 10, '', { font: '24px Arial Bold', fill: '#FBFBAC' });
  cursors = this.input.keyboard.createCursorKeys();
  // this.add.image(400, 300, "ship").setOrigin(0, 0)
  // ship = this.add.sprite(400, 300, "ship")
  ship = this.physics.add.image(400, 300, 'ship');

  ship.setDamping(true);
  ship.setDrag(0.99);
  ship.setMaxVelocity(200);

  // Fires bullet from player on left click of mouse
//   this.input.keyboard.on('keydown_SPACE', function (pointer, time, lastFired) {
//     if (active === false)
//       return;

//     // Get bullet from bullets group
//     var bullet = playerBullets.get().setActive(true).setVisible(true);

//     if (bullet)
//     {
//         bullet.fire(ship);
//         this.physics.velocityFromRotation(bullet.rotation, 200, bullet.body.acceleration);
//         // this.physics.add.collider(enemy, bullet, enemyHitCallback);
//     }
// }, this);

  // this.sound.play('shoot');

  this.enemies = [];

  this.enemiesTotal = 20;
  this.enemiesAlive = 20;

  for (var i = 0; i < this.enemiesTotal; i++)
  {
      // this.enemies.push(new EnemyShip(i, this, this.ship, this.enemyBullets));
  }
  // this.physics.enable(ship, Phaser.Physics.Arcade);

  cursors = this.input.keyboard.createCursorKeys();
}

function update(time, delta): void {

  if (time > lastPositionUpdate) {
    // Send position update
  }
  lastPositionUpdate += 5;
  
  if (cursors.left.isDown)
  {
      ship.setAngularVelocity(-300);
  }
  else if (cursors.right.isDown)
  {
      ship.setAngularVelocity(300);
  }
  else
  {
      ship.setAngularVelocity(0);
  }

    if (cursors.up.isDown)
    {
        this.physics.velocityFromRotation(ship.rotation, 200, ship.body.acceleration);
    }
    else
    {
        ship.setAcceleration(0);
    }

    // if (cursors.spaceKey.isDown && time > lastFired)
    // {
    //     var bullet = bullets.get();

    //     if (bullet)
    //     {
    //         bullet.fire(ship.x, ship.y);

    //         lastFired = time + 50;
    //     }
    // }

    this.physics.world.wrap(ship, 32);
}
