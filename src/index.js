import Phaser from "phaser";
//import logoImg from "./assets/logo.png";

// based on this example:
// * http://jsfiddle.net/gJ4kA/

// further reads:
// * https://gamedev.stackexchange.com/questions/71233/planet-gravity
// * https://gamedev.stackexchange.com/questions/21063/2d-planet-gravity
// * http://codeflow.org/entries/2010/aug/28/integration-by-example-euler-vs-verlet-vs-runge-kutta/

// calc: https://www.ajdesigner.com/phpgravity/gravity_acceleration_equation.php#ajscroll

// todo: how to scale -> m/s² conversion to px/s² etc...

var config = {
  type: Phaser.WEBGL,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'phaser-example',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080
  },
  parent: 'a-game-of-space-and-gravity',
  //width: 1024,
  //height: 768,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: true
    }
  },
  scene: {
      preload: preload,
      create: create,
      update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.load.atlas('space', 'assets/space.png', 'assets/space.json');
  this.load.image('target', 'assets/ball.png');
  this.load.image('planet', 'assets/planet.png');
  this.load.image('moon', 'assets/moon.png');
}

var planet;
var moon;
var ship;
var keyBackThrust;
var keyFwdThrust;
var keyLeft;
var keyRight;
var keyShipCam;
var keyPlanetCam;
var keyMoonCam;
var reticle;
var mainCam;
var text;
var rt;
var trail;

var G = 0.5;//6.67e-11;
var planetMass = 500000000;
var moonMass =   0.000001;//100;//planetMass/20;

var planetRadius = 2500;
var moonRadius = 250;
var shipRadius = 10;

var graphics;

//var initialSpeed = 0;
//var initialVector;

function create() {

  var FKey = this.input.keyboard.addKey('F');

  FKey.on('down', function () {

      if (this.scale.isFullscreen)
      {
          //button.setFrame(0);
          this.scale.stopFullscreen();
      }
      else
      {
          //button.setFrame(1);
          this.scale.startFullscreen();
      }

  }, this);

  graphics = this.add.graphics();

  planet = this.physics.add.sprite(400, 300, 'planet').setOrigin(0.5, 0.5).setDisplaySize(planetRadius*2,planetRadius*2);
  planet.setCircle(312);
  planet.setOffset(10,10);

  moon = this.physics.add.sprite(400, 15600, 'moon').setOrigin(0.5, 0.5).setDisplaySize(moonRadius*2,moonRadius*2);
  moon.setCircle(moonRadius+15);
  moon.setOffset(25,25);

  ship = this.physics.add.sprite(400, -2500, 'space', 'ship').setDepth(2).setOrigin(0.5, 0.5).setDisplaySize(20,20);


  rt = this.add.renderTexture(-5000, -5000, 10000, 10000);
  trail = this.add.image(0, 0, 'space', 'ship').setOrigin(0.5,0.5).setDisplaySize(10,10).setVisible(false);

  ship.body.allowGravity = true;
  moon.body.allowGravity = true;

  var shipBodyPos = new Phaser.Math.Vector2(ship.body.position.x, ship.body.position.y);

  // when creating the body position seems to not be at the right position and using just .x seems to lead to a tiny error
  var planetBodyPos = new Phaser.Math.Vector2(planet.body.position.x + 10, planet.body.position.y + 10);
  //var planetBodyPos = new Phaser.Math.Vector2(planet.body.position.x + planetRadius + 10, planet.body.position.y + planetRadius + 10);
  var moonBodyPos = new Phaser.Math.Vector2(moon.x, moon.y);

  // setup ship initial velocity
  var shipPlanetDistance = Phaser.Math.Distance.Between(planetBodyPos.x, planetBodyPos.y, shipBodyPos.x, shipBodyPos.y);

  // perpendicular 2d vector to gravitational vector (https://gamedev.stackexchange.com/a/146492)
  var initialShipVector = new Phaser.Math.Vector2(-(planetBodyPos.y - shipBodyPos.y), planetBodyPos.x - shipBodyPos.x).normalize();
  var initialShipSpeed = Math.sqrt(G*planetMass/shipPlanetDistance);

  ship.body.velocity.x = initialShipVector.x * initialShipSpeed;
  ship.body.velocity.y = initialShipVector.y * initialShipSpeed;

  // setup moon initial velocity
  var moonPlanetDistance = Phaser.Math.Distance.Between(planetBodyPos.x, planetBodyPos.y, moonBodyPos.x, moonBodyPos.y);

  // perpendicular 2d vector to gravitational vector (https://gamedev.stackexchange.com/a/146492)
  var initialMoonVector = new Phaser.Math.Vector2(-(planetBodyPos.y - moonBodyPos.y), planetBodyPos.x - moonBodyPos.x).normalize();
  var initialMoonSpeed = Math.sqrt(G*planetMass/moonPlanetDistance);

  moon.body.velocity.x = initialMoonVector.x * initialMoonSpeed;
  moon.body.velocity.y = initialMoonVector.y * initialMoonSpeed;


  text = this.add.text(32, 32).setScrollFactor(0).setFontSize(16).setColor('#ffffff');

  // ship cam
  mainCam = this.cameras.main;
  mainCam.startFollow(ship);

  keyBackThrust = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  keyFwdThrust = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

  keyPlanetCam = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  keyPlanetCam.on('down', function (key, event) {
      // planet cam
      mainCam.startFollow(planet);
      mainCam.zoom = 0.13;
  });

  keyMoonCam = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
  keyMoonCam.on('down', function (key, event) {
      // moon cam
      mainCam.startFollow(moon);
      mainCam.zoom = 0.5;
  });

  keyShipCam = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  keyShipCam.on('down', function (key, event) {
      // ship cam
      mainCam.startFollow(ship);
      mainCam.zoom = 1;
  });

  reticle = this.physics.add.sprite(ship.x, ship.y + 50, 'target');
  reticle.setOrigin(0.5, 0.5).setDisplaySize(5, 5);

      // Pointer lock will only work after mousedown
  game.canvas.addEventListener('mousedown', function () {
      game.input.mouse.requestPointerLock();
  });

  this.input.on('pointermove', function (pointer) {
      if (this.input.mouse.locked)
      {
          reticle.x += pointer.movementX;
          reticle.y += pointer.movementY;
      }
  }, this);

}

function update() {

  var shipBodyPos = new Phaser.Math.Vector2(ship.body.x + shipRadius, ship.body.y + shipRadius);
  ship.rotation = Phaser.Math.Angle.Between(ship.x, ship.y, reticle.x, reticle.y);
  //restrainReticle()

  reticle.body.velocity.x = ship.body.velocity.x;
  reticle.body.velocity.y = ship.body.velocity.y;

  /*var reticleBodyPos = new Phaser.Math.Vector2(reticle.body.x + reticle.body.width/2, reticle.body.y + reticle.body.height/2);

  shipReticleNormalized = new Phaser.Math.Vector2(reticleBodyPos.x - shipBodyPos.x, reticleBodyPos.y - shipBodyPos.y).normalize();

  if (shipBodyPos.x + shipReticleNormalized.x * 100 > reticleBodyPos.x) {
      reticle.body.x = shipBodyPos.x + shipReticleNormalized.x * 100;
  } else if (shipBodyPos.x + shipReticleNormalized.x * 100 < reticleBodyPos.x) {
      reticle.body.x = shipBodyPos.x + shipReticleNormalized.x * 100;
  }

  if (shipBodyPos.y + shipReticleNormalized.y * 100 > reticleBodyPos.y) {
      reticle.body.y = shipBodyPos.y + shipReticleNormalized.y * 100;
  } else if (shipBodyPos.y + shipReticleNormalized.y * 100 < reticleBodyPos.y) {
      reticle.body.y = shipBodyPos.y + shipReticleNormalized.y * 100;
  }*/

  var noCursorDown = true;
  var downVec = Phaser.Math.Vector2.ZERO;
  var upVec = Phaser.Math.Vector2.ZERO;
  var leftVec = Phaser.Math.Vector2.ZERO;
  var rightVec = Phaser.Math.Vector2.ZERO;

  if (keyLeft.isDown) {
      noCursorDown = false;
      leftVec = this.physics.velocityFromAngle(ship.angle - 90, 10);
  }

  if (keyRight.isDown) {
      noCursorDown = false;
      rightVec = this.physics.velocityFromAngle(ship.angle + 90, 10);
  }

  if (keyBackThrust.isDown) {
      noCursorDown = false;
      downVec = this.physics.velocityFromAngle(ship.angle - 180, 10);
  }

  if (keyFwdThrust.isDown) {
      noCursorDown = false;
      upVec = this.physics.velocityFromAngle(ship.angle, 200);
  }

  var addVec = new Phaser.Math.Vector2()
      .add(downVec)
      .add(upVec)
      .add(leftVec)
      .add(rightVec);

  if (noCursorDown) {
      ship.setAcceleration(0);
  } else {
      ship.body.acceleration = addVec;
  }

  var planetBodyPos = new Phaser.Math.Vector2(planet.body.x + planetRadius + 10, planet.body.y + planetRadius + 10);
  var moonBodyPos = new Phaser.Math.Vector2(moon.body.x + moonRadius, moon.body.y + moonRadius);

  var shipAcc = new Phaser.Math.Vector2();

  var shipPlanetDistance = Phaser.Math.Distance.Between(planetBodyPos.x, planetBodyPos.y, shipBodyPos.x, shipBodyPos.y);
  var shipPlanetDistanceSquared = Math.pow(shipPlanetDistance, 2);
  var shipPlanetGravity = new Phaser.Math.Vector2((G*planetMass)/shipPlanetDistanceSquared, (G*planetMass)/shipPlanetDistanceSquared);

  // Normalize and multiply by actual strength of gravity desired
  var shipPlanetNormalized = new Phaser.Math.Vector2(planetBodyPos.x - shipBodyPos.x, planetBodyPos.y - shipBodyPos.y).normalize();
  shipAcc.add(shipPlanetNormalized.clone().multiply(shipPlanetGravity));

  // add atmospheric drag, but not with this drag since it decelerates just to 0, instead of just slowing down things

  var shipMoonDistance = Phaser.Math.Distance.Between(moonBodyPos.x, moonBodyPos.y, shipBodyPos.x, shipBodyPos.y);
  var shipMoonDistanceSquared = Math.pow(shipMoonDistance, 2);
  var shipMoonGravity = new Phaser.Math.Vector2((G*moonMass)/shipMoonDistanceSquared, (G*moonMass)/shipMoonDistanceSquared);

  // Normalize and multiply by actual strength of gravity desired
  var shipMoonNormalized = new Phaser.Math.Vector2(moonBodyPos.x - shipBodyPos.x, moonBodyPos.y - shipBodyPos.y).normalize();
  shipAcc.add(shipMoonNormalized.clone().multiply(shipMoonGravity));

  ship.body.gravity = shipAcc;

  var moonPlanetDistance = Phaser.Math.Distance.Between(planetBodyPos.x, planetBodyPos.y, moonBodyPos.x, moonBodyPos.y);
  var moonPlanetDistanceSquared = Math.pow(moonPlanetDistance, 2);
  var moonPlanetGravity = new Phaser.Math.Vector2((G*planetMass)/moonPlanetDistanceSquared, (G*planetMass)/moonPlanetDistanceSquared);

  // Normalize and multiply by actual strength of gravity desired
  var moonPlanetNormalized = new Phaser.Math.Vector2(planetBodyPos.x - moonBodyPos.x, planetBodyPos.y - moonBodyPos.y).normalize();
  var moonAcc = moonPlanetNormalized.clone().multiply(moonPlanetGravity);

  moon.body.gravity = moonAcc;

  graphics.clear();

  graphics.lineStyle(2, 0x0000ff, 1);
  graphics.lineBetween(shipBodyPos.x, shipBodyPos.y, shipBodyPos.x + shipPlanetNormalized.x * 50, shipBodyPos.y + shipPlanetNormalized.y * 50);

  graphics.lineStyle(2, 0xff0000, 1);
  graphics.lineBetween(shipBodyPos.x, shipBodyPos.y, shipBodyPos.x + shipMoonNormalized.x * 50, shipBodyPos.y + shipMoonNormalized.y * 50);


  var shipTrajectory = estimateTrajectory(shipBodyPos.clone(), ship.body.velocity.clone(), planetBodyPos.clone(), moonBodyPos.clone(), moon.body.velocity.clone());
  var currentPos = shipBodyPos;
  for (var i = 0; i < shipTrajectory.length; i++) {
      var nextPos = shipTrajectory[i];
      graphics.lineStyle(2, 0xffff00, 1);
      graphics.lineBetween(currentPos.x, currentPos.y, nextPos.x, nextPos.y);
      currentPos = nextPos;
  }

  trail.x = shipBodyPos.x + 5000;
  trail.y = shipBodyPos.y + 5000;
  rt.draw(trail);

  text.setText([
    "G: " + G,
    //"traj: " + shipTrajectory[1].x + ":" + shipTrajectory[1].y + "(" + shipTrajectory.length + ")",
    //"ship: " + shipBodyPos.x + ":" + shipBodyPos.y,
    //"pos: " + planet.body.offset.x + " -- " + planet.y,
    "shipAcc: " + shipAcc.x + " : " + shipAcc.y,
    "acc: " + ship.body.acceleration.x + " : " + ship.body.acceleration.y,
    "vel:       " + ship.body.speed + "(" + ship.body.velocity.x + ":" + ship.body.velocity.y + ")",
    //"initVel: " + initialSpeed,
    //"initVec: "  + initialVector.x + ":" + initialVector.y,
    "shipPlanetDistance: " + shipPlanetDistance,
    "moonPlanetDistance: " + moonPlanetDistance
    //"planetMass: " + Math.sqrt(shipAcc.x * shipAcc.x + shipAcc.y * shipAcc.y)*distanceSquared/G,
  ]);
}


function estimateTrajectory(shipBodyPos, shipVelocity, planetBodyPos, moonBodyPos2, moonVelocity) {
      /*currentPos = startingPosition
  currentVel = startingVelcoity
  resultTrajectory.append(currentPos)
  for N times{
      currentForce = gatherForces()
      currentAccel = currentForce / mass
      deltaT = fixedTimeStep
      nextPos = currentPos + currentVel * deltaT + currentAccel * deltaT * deltaT * 0.5
      nextVel = currentVel + currentAccel * deltaT
      resultTrajectory.append(nextPos)
      currentPos = nextPos
      currentVel = nextVel
  }*/

  var steps = 10;
  var deltaT = 0.2;
  var shipTrajectory = [shipBodyPos.clone()];
  var currentBodyShipPos = shipBodyPos.clone();
  var currentShipVel = shipVelocity.clone();

  var moonBodyPos = moonBodyPos2.clone();
  var currentMoonVel = moonVelocity.clone();

  for (var i = 0; i < steps; i++) {

      // gather forces accs
      var currentShipAcc = new Phaser.Math.Vector2();

      var shipPlanetDistance = Phaser.Math.Distance.Between(planetBodyPos.x, planetBodyPos.y, currentBodyShipPos.x, currentBodyShipPos.y);
      var shipPlanetDistanceSquared = Math.pow(shipPlanetDistance, 2);
      var shipPlanetGravity = new Phaser.Math.Vector2((G*planetMass)/shipPlanetDistanceSquared, (G*planetMass)/shipPlanetDistanceSquared);
      var shipPlanetNormalized = new Phaser.Math.Vector2(planetBodyPos.x - currentBodyShipPos.x, planetBodyPos.y - currentBodyShipPos.y).normalize();
      currentShipAcc.add(shipPlanetNormalized.clone().multiply(shipPlanetGravity));

      var shipMoonDistance = Phaser.Math.Distance.Between(moonBodyPos.x, moonBodyPos.y, currentBodyShipPos.x, currentBodyShipPos.y);
      var shipMoonDistanceSquared = Math.pow(shipMoonDistance, 2);
      var shipMoonGravity = new Phaser.Math.Vector2((G*moonMass)/shipMoonDistanceSquared, (G*moonMass)/shipMoonDistanceSquared);
      var shipMoonNormalized = new Phaser.Math.Vector2(moonBodyPos.x - currentBodyShipPos.x, moonBodyPos.y - currentBodyShipPos.y).normalize();
      currentShipAcc.add(shipMoonNormalized.clone().multiply(shipMoonGravity));

      var moonPlanetDistance = Phaser.Math.Distance.Between(planetBodyPos.x, planetBodyPos.y, moonBodyPos.x, moonBodyPos.y);
      var moonPlanetDistanceSquared = Math.pow(moonPlanetDistance, 2);
      var moonPlanetGravity = new Phaser.Math.Vector2((G*planetMass)/moonPlanetDistanceSquared, (G*planetMass)/moonPlanetDistanceSquared);

      // Normalize and multiply by actual strength of gravity desired
      var moonPlanetNormalized = new Phaser.Math.Vector2(planetBodyPos.x - moonBodyPos.x, planetBodyPos.y - moonBodyPos.y).normalize();
      var currentMoonAcc = moonPlanetNormalized.clone().multiply(moonPlanetGravity);

      var nextMoonBodyPos = new Phaser.Math.Vector2(
          moonBodyPos.x + currentMoonVel.x * deltaT + currentMoonAcc.x * deltaT * deltaT * 0.5,
          moonBodyPos.y + currentMoonVel.y * deltaT + currentMoonAcc.y * deltaT * deltaT * 0.5,
      );

      var nextMoonVel = new Phaser.Math.Vector2(
          currentMoonVel.x + currentMoonAcc.x * deltaT,
          currentMoonVel.y + currentMoonAcc.y * deltaT
      );

      var nextBodyShipPos = new Phaser.Math.Vector2(
          currentBodyShipPos.x + currentShipVel.x * deltaT + currentShipAcc.x * deltaT * deltaT * 0.5,
          currentBodyShipPos.y + currentShipVel.y * deltaT + currentShipAcc.y * deltaT * deltaT * 0.5
      );

      var nextShipVel = new Phaser.Math.Vector2(
          currentShipVel.x + currentShipAcc.x * deltaT,
          currentShipVel.y + currentShipAcc.y * deltaT
      )

      shipTrajectory.push(nextBodyShipPos.clone());

      currentBodyShipPos = nextBodyShipPos.clone();
      currentShipVel = nextShipVel.clone();

      moonBodyPos = nextMoonBodyPos.clone();
      currentMoonVel = nextMoonVel.clone();
  }
  return shipTrajectory;
}
