const DEFAULT_LOCK_TYPE = 2;
const FORK_TASK_TYPE = 100;
const EMPTY_GOODS_REGION = Object.freeze({ name: '', point: [] });
const LOADED_GOODS_REGION = Object.freeze({
  name: '',
  point: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ]
});
const ROBOT_FEATURES = [
  { active: true, expiry_date: 'never-expire', name: 'rbk_diff' },
  { active: true, expiry_date: 'never-expire', name: 'pro_loc_func' },
  { active: true, expiry_date: 'never-expire', name: 'pro_rec_func' },
  { active: true, expiry_date: 'never-expire', name: 'pro_mod_func' }
];
const ROBOT_VERSION_LIST = {
  Calib: '1.0.0-git:master-0c44d2c-desc:Aug  9 2025 16:51:07',
  CalibrationTask: '1.0.0-git:3.4.6-50b8f2e-desc:Aug  9 2025 16:45:13',
  ChargerAdapter: '1.0.0-git:3.4.6-037edd3-desc:Aug  9 2025 16:45:29',
  DSPChassis: '1.0.0-git:3.4.6-ac1ab1de-desc:Aug  9 2025 16:46:51',
  GNSSModulesDriver: '0.1.0-git:3.4.6-e414da8-desc:Aug  9 2025 16:46:25',
  LocalReMap: '1.0.0-git:3.4.6-186ea26-desc:Aug  9 2025 16:46:26',
  MCLoc: '1.0.0-git:3.4.6-b9f47c4-desc:Aug  9 2025 16:51:18',
  MagneticSensor: '1.0.0-git:3.4.6-5a5b84b-desc:Aug  9 2025 16:47:24',
  MailSender: '1.0.0-git:3.4.6-872032c-desc:Aug  9 2025 16:48:08',
  MoveFactory: '4.5.26-git:3.4.6-0efe0f47-desc:Aug  9 2025 16:51:53',
  MultiDcamera: '1.0.0-git:3.4.6-04e0980f-desc:Aug  9 2025 16:51:35',
  MultiLaser: '1.0.0-git:3.4.6-80b237d-desc:Aug  9 2025 16:48:53',
  NetProtocol: '1.0.0-git:3.4-ab30d9b-desc:Aug  9 2025 16:49:37',
  OdoCalculator: '1.0.0-git:3.4.6-0381e4b-desc:Aug  9 2025 16:48:19',
  OnlineMapLogger: '1.0.0-git:3.4.6-4907bc2-desc:Aug  9 2025 16:48:17',
  OpticalMotionCapture: '1.0.0-git:3.4.6-1de3e5b-desc:Aug  9 2025 16:48:19',
  RFIDSensor: '1.0.0-git:3.4.6-7f58730-desc:Aug  9 2025 16:48:39',
  RecoFactory: '1.0.0-git:3.4.6-e4a9366-desc:Aug  9 2025 16:50:05',
  Scanner: '1.0.0-git:3.4.6-1049267-desc:Aug  9 2025 16:48:39',
  SeerRoller: '1.0.0-git:3.4.6-82ae46a-desc:Aug  9 2025 16:48:47',
  SensorFuser: '1.0.0-git:3.4.6-efbbc2b-desc:Aug  9 2025 16:51:41',
  SlaMapping: '1.0.0-git:3.4.6-2c4e23b-desc:Aug  9 2025 16:49:11',
  SoundPlayer: '1.0.0-git:3.4.6-d28c9f7-desc:Aug  9 2025 16:49:37',
  SystemVersion: '0.0.7_20241023172600',
  TaskManager: '1.0.0-git:3.4.6-cd41ea0-desc:Aug  9 2025 16:49:46',
  'arm-patch': '0.9.32'
};
const ROBOT_NETWORK_CONTROLLERS = [
  {
    description: 'Ethernet controller',
    driver: 'unknown',
    driverversion: 'unknown',
    logicalname: 'unknown',
    product: 'Marvell Technology Group Ltd.',
    serial: 'unknown',
    vendor: 'Marvell Technology Group Ltd.'
  },
  {
    description: 'Ethernet interface',
    driver: 'fec',
    driverversion: '5.15.148-seer+',
    logicalname: 'eth0',
    product: 'unknown',
    serial: '00:14:2d:e7:26:32',
    vendor: 'unknown'
  },
  {
    description: 'Ethernet interface',
    driver: 'fec',
    driverversion: '5.15.148-seer+',
    logicalname: 'eth1',
    product: 'unknown',
    serial: '00:14:2d:e7:26:32',
    vendor: 'unknown'
  }
];
const ROBOT_HARDWARE = { cpus: [] };

module.exports = {
  DEFAULT_LOCK_TYPE,
  FORK_TASK_TYPE,
  EMPTY_GOODS_REGION,
  LOADED_GOODS_REGION,
  ROBOT_FEATURES,
  ROBOT_VERSION_LIST,
  ROBOT_NETWORK_CONTROLLERS,
  ROBOT_HARDWARE
};
