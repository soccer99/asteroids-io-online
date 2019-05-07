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
  }
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
  this.load.image("ship", "assets/sprites/ship2.png");
  this.load.image("bullet", "assets/sprites/bullet1.png");
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
let lastPositionUpdate = 0;
let ws;
let player_id;
let enemyShips = {};

let startingX;
let startingY;
let startingRotation;
let enemyAcceleration = {};

function create(): void {
  // Websocket init
  // initialize websocket with event listeners
  var mws = () => {
    let ws = new WebSocket("ws://localhost:8888/gamesocket");
    ws.onopen = e => {
      console.log("opened");
      console.log(e);
    };
    ws.onmessage = e => {
      console.log("ws.onmessage");
      let data = JSON.parse(e.data);
      console.log(data.message_type);
      if (data.message_type == "INITIAL_STATE") {
        player_id = data.settings.player_id;

        ship.x = data.state.players[player_id].x;
        ship.y = data.state.players[player_id].y;
        ship.rotation = data.state.players[player_id].rotation;

        // TODO : loop through all players and create them
        for (let key in data.state.players) {
          if (player_id != key) {
            let p = data.state.players[key];
            enemyShips[key] = this.physics.add.image(p.x, p.y, "ship");

            enemyShips[key].setDamping(true);
            enemyShips[key].setDrag(0.99);
            enemyShips[key].setMaxVelocity(200);

            enemyShips[key].rotation = p.rotation;
            // enemyShips[key].body.acceleration = p.acceleration
          }
        }
      } else if (data.message_type == "PLAYER_JOINED") {
        console.log("Player Joined!");
        console.log(data);
        let new_player = data.new_player;
        let new_player_id = new_player.id;
        enemyShips[new_player_id] = this.physics.add.image(
          new_player.x,
          new_player.y,
          "ship"
        );

        enemyShips[new_player_id].setDamping(true);
        enemyShips[new_player_id].setDrag(0.99);
        enemyShips[new_player_id].setMaxVelocity(200);

        enemyShips[new_player_id].rotation = new_player.rotation;
      } else if (data.message_type == "PLAYER_LEFT") {
        console.log("Player left!");
        console.log(data);
      } else if (data.message_type == "PLAYER_POSITION") {
        // for (let i=0; i<data.)
      } else if (data.message_type == "PLAYER_KEY") {
        console.log("player key event");
        console.log(data.state.players);
        for (let other_id in data.state.players) {
          if (other_id != player_id) {
            let p = data.state.players[other_id];
            enemyShips[other_id].x = p.x;
            enemyShips[other_id].y = p.y;
            enemyShips[other_id].rotation = p.rotation;
            // enemyShips[other_id].body.acceleration = p.acceleration

            if (p.keys["left"]) {
              enemyShips[other_id].setAngularVelocity(-300);
            } else if (p.keys["right"]) {
              enemyShips[other_id].setAngularVelocity(300);
            } else {
              enemyShips[other_id].setAngularVelocity(0);
            }

            enemyAcceleration[other_id] = p.keys["up"];
            // if (p.keys["up"] == true) {
            // } else if (p.keys["up"] == false) {
            //   enemyAcceleration[other_id] = p.keys["up"]
            // }
          }
        }
      }
    };
    ws.onclose = e => {
      console.log("closed");
      console.log(e);
    };
    return ws;
  };

  ws = mws();

  // let playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
  // bullets = this.add.group({
  //   classType: Bullet,
  //   maxSize: 10,
  //   runChildUpdate: true
  // });
  // let enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });

  this.info = this.add.text(10, 10, "", {
    font: "24px Arial Bold",
    fill: "#FBFBAC"
  });
  cursors = this.input.keyboard.createCursorKeys();
  // this.add.image(400, 300, "ship").setOrigin(0, 0)
  // ship = this.add.sprite(400, 300, "ship")
  ship = this.physics.add.image(400, 300, "ship");

  ship.setDamping(true);
  ship.setDrag(0.99);
  ship.setMaxVelocity(200);

  // Fires bullet from player on left click of mouse
  this.input.keyboard.on(
    "keydown_SPACE",
    function(pointer, time, lastFired) {
      var jsn = JSON.stringify({
        message_type: "PLAYER_POSITION",
        data: {
          id: player_id,
          x: ship.x,
          y: ship.y,
          rotation: ship.rotation,
          velocity: 5
        }
      });
      // send
      ws.send(jsn);
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
    },
    this
  );

  // this.sound.play('shoot');

  this.enemies = [];

  this.enemiesTotal = 20;
  this.enemiesAlive = 20;

  for (var i = 0; i < this.enemiesTotal; i++) {
    // this.enemies.push(new EnemyShip(i, this, this.ship, this.enemyBullets));
  }
  // this.physics.enable(ship, Phaser.Physics.Arcade);

  cursors = this.input.keyboard.createCursorKeys();

  this.input.keyboard.on("keydown_LEFT", function(event) {
    send_key("left", true);
  });
  this.input.keyboard.on("keyup_LEFT", function(event) {
    send_key("left", false);
  });
  this.input.keyboard.on("keydown_RIGHT", function(event) {
    send_key("right", true);
  });
  this.input.keyboard.on("keyup_RIGHT", function(event) {
    send_key("right", false);
  });
  this.input.keyboard.on("keydown_UP", function(event) {
    send_key("up", true);
  });
  this.input.keyboard.on("keyup_UP", function(event) {
    send_key("up", false);
  });
}

function send_key(key, pressed) {
  var json = JSON.stringify({
    message_type: "PLAYER_KEY",
    data: {
      id: player_id,
      x: ship.x,
      y: ship.y,
      rotation: ship.rotation,
      acceleration: ship.body.acceleration,
      key: key,
      pressed: pressed
    }
  });
  // send
  ws.send(json);
}

function update(time, delta): void {
  if (cursors.left.isDown) {
    ship.setAngularVelocity(-300);
  } else if (cursors.right.isDown) {
    ship.setAngularVelocity(300);
  } else {
    ship.setAngularVelocity(0);
  }

  if (cursors.up.isDown) {
    this.physics.velocityFromRotation(
      ship.rotation,
      200,
      ship.body.acceleration
    );
  } else {
    ship.setAcceleration(0);
  }

  for (let other_ship_id in enemyAcceleration) {
    if (other_ship_id != player_id) {
      if (enemyAcceleration[other_ship_id] == true) {
        this.physics.velocityFromRotation(
          enemyShips[other_ship_id].rotation,
          200,
          enemyShips[other_ship_id].body.acceleration
        );
      } else {
        enemyShips[other_ship_id].setAcceleration(0);
      }
    }
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
  for (let key in enemyShips) {
    this.physics.world.wrap(enemyShips[key], 32);
  }
}
