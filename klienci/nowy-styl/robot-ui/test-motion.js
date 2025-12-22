// test-motion.js

// Jeśli używasz .env:
require('dotenv').config();

const { APIClient } = require('./api-client');

// Domyślne wartości z Twojego opisu (nadpisywane przez .env jeśli jest)
const RDS_API_HOST = process.env.RDS_API_HOST || 'http://10.72.17.168:8080';
const RDS_LOGIN = process.env.RDS_LOGIN || 'admin';
const RDS_PASSWORD = process.env.RDS_PASSWORD || '123456';
const ROBOT_ID = process.env.ROBOT_ID || 'INV-CDD14-01';

// Prosty helper do sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('RDS_API_HOST =', RDS_API_HOST);
  console.log('RDS_LOGIN    =', RDS_LOGIN);
  console.log('ROBOT_ID     =', ROBOT_ID);
  console.log('---');

  const client = new APIClient(RDS_API_HOST, RDS_LOGIN, RDS_PASSWORD, 'en');

  // Jeśli chcesz przejąć kontrolę z RDS GUI:
  // console.log('Przejmuję kontrolę nad robotem (lock)...');
  // await client.robotSeizeControl(ROBOT_ID);

  // --- TEST 1: open-loop: jazda do przodu przez 2 sekundy, potem stop ---

//  console.log('TEST 1: /api/controlled-agv/{id}/open-loop');
//
//  console.log('-> Wysyłam komendę jazdy do przodu (open-loop)...');
//  await client.openLoop(ROBOT_ID, {
//    vx: 0.3,    // prędkość do przodu (m/s – dopasuj do siebie)
//    vy: 0.0,
//    w: 0.0,
//    steer: 0.0,
//    realSteer: 0.0
//  });
//
//  console.log('   Robot powinien jechać do przodu ~2 sekundy...');
//  await sleep(2000);
//
//  console.log('-> Wysyłam komendę STOP (vx=0, vy=0, w=0)...');
//  await client.openLoop(ROBOT_ID, {
//    vx: 0.0,
//    vy: 0.0,
//    w: 0.0,
//    steer: 0.0,
//    realSteer: 0.0
//  });

//  console.log('TEST 1 zakończony.');
//  console.log('---');

  // --- TEST 2: /controlMotion: duration = 2 sekundy ---

  console.log('TEST 2: /controlMotion');

  console.log('-> Wysyłam controlMotion: jazda do przodu z duration=2.0...');
  res = await client.controlMotion(ROBOT_ID, {
    vx: -0.3,
    vy: 0.0,
    w: 0.0,
    real_steer: 0.8,
    steer: 0.0,
    duration: 1000.0   // w dokumentacji zwykle sekundy; jeśli będzie inaczej, zobaczysz po zachowaniu
  });

  await sleep(1000);

  console.log('-> Wysyłam komendę STOP (vx=0, vy=0, w=0)...');
  res = await client.controlMotion(ROBOT_ID, {
    vx: 0.0,
    vy: 0.0,
    w: 0.0,
    real_steer: 0.8,
    steer: 0.0,
    duration: 0.0   // w dokumentacji zwykle sekundy; jeśli będzie inaczej, zobaczysz po zachowaniu
  });

//  console.log('Odpowiedź /controlMotion:', res);
//  console.log('TEST 2: robot powinien sam zatrzymać się po ok. 2 sekundach.');
//  console.log('---');

  // Jeśli chcesz zwolnić lock:
  // console.log('Zwalniam kontrolę (unlock)...');
  // await client.robotReleaseControl(ROBOT_ID);

  console.log('Gotowe.');
}

main().catch(err => {
  console.error('Błąd w teście:', err);
  process.exit(1);
});

