// backend/seed/materials.js
// Seeds a large, varied set of Contribution/Material records for search testing.
// Mixes department-specific codes (CS3591, ME3491, EC3401...) with
// university-common codes shared across every department (UC3791, GE3151,
// MA3151, PH3256, BE3251...) so the dataset looks like a real curriculum,
// not one repeating pattern.
// Run: node seed/materials.js   (make sure MONGO_URI is set in your .env)

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // fixes ECONNREFUSED on querySrv for mongodb+srv:// on some Windows/network setups
require('dotenv').config();
const mongoose = require('mongoose');

// Adjust this path if your Material model lives elsewhere / is named differently
const Material = require('../models/Material');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// ---- Department-specific subjects, per year (1-4) ----
// Codes loosely follow the real Anna-University style: 2-letter dept + digit(s).
const DEPARTMENT_SUBJECTS = {
  CSE: {
    1: [{ code: 'CS3151', name: 'Introduction to Programming' }, { code: 'CS3152', name: 'Digital Principles and Computer Organization' }],
    2: [{ code: 'CS3251', name: 'Data Structures' }, { code: 'CS3252', name: 'Object Oriented Programming' }, { code: 'CS3253', name: 'Database Management Systems' }],
    3: [{ code: 'CS3591', name: 'Operating Systems' }, { code: 'CS3591', name: 'Computer Networks' }, { code: 'CS3691', name: 'Design and Analysis of Algorithms' }],
    4: [{ code: 'CS3791', name: 'Machine Learning' }, { code: 'CS3792', name: 'Compiler Design' }, { code: 'CS3793', name: 'Cloud Computing' }],
  },
  IT: {
    1: [{ code: 'IT3151', name: 'Programming for Problem Solving' }, { code: 'IT3152', name: 'Fundamentals of Data Structures' }],
    2: [{ code: 'IT3251', name: 'Web Essentials' }, { code: 'IT3252', name: 'Data Structures and Algorithms' }],
    3: [{ code: 'IT3501', name: 'Software Engineering' }, { code: 'IT3502', name: 'Computer Networks' }],
    4: [{ code: 'IT3701', name: 'Cyber Security' }, { code: 'IT3702', name: 'Cloud Computing Techniques' }],
  },
  ECE: {
    1: [{ code: 'EC3151', name: 'Electron Devices' }, { code: 'EC3152', name: 'Circuit Analysis' }],
    2: [{ code: 'EC3251', name: 'Electronic Circuits' }, { code: 'EC3252', name: 'Signals and Systems' }],
    3: [{ code: 'EC3401', name: 'Digital Signal Processing' }, { code: 'EC3402', name: 'VLSI Design' }, { code: 'EC3403', name: 'Communication Systems' }],
    4: [{ code: 'EC3701', name: 'Embedded Systems' }, { code: 'EC3702', name: 'Wireless Communication' }],
  },
  EEE: {
    1: [{ code: 'EE3151', name: 'Basic Electrical Circuits' }, { code: 'EE3152', name: 'Electromagnetic Fields' }],
    2: [{ code: 'EE3251', name: 'Electrical Machines I' }, { code: 'EE3252', name: 'Digital Logic Circuits' }],
    3: [{ code: 'EE3401', name: 'Power System Analysis' }, { code: 'EE3402', name: 'Control Systems' }],
    4: [{ code: 'EE3701', name: 'Power Electronics' }, { code: 'EE3702', name: 'Renewable Energy Systems' }],
  },
  MECH: {
    1: [{ code: 'ME3151', name: 'Engineering Mechanics' }, { code: 'ME3152', name: 'Engineering Graphics' }],
    2: [{ code: 'ME3251', name: 'Thermodynamics' }, { code: 'ME3252', name: 'Strength of Materials' }],
    3: [{ code: 'ME3491', name: 'Fluid Mechanics and Machinery' }, { code: 'ME3492', name: 'Manufacturing Technology' }],
    4: [{ code: 'ME4301', name: 'Heat and Mass Transfer' }, { code: 'ME4302', name: 'Computer Aided Design and Manufacturing' }],
  },
  CIVIL: {
    1: [{ code: 'CE3151', name: 'Engineering Mechanics' }, { code: 'CE3152', name: 'Engineering Graphics' }],
    2: [{ code: 'CE3251', name: 'Surveying' }, { code: 'CE3252', name: 'Strength of Materials' }],
    3: [{ code: 'CE3491', name: 'Structural Analysis' }, { code: 'CE3492', name: 'Geotechnical Engineering' }],
    4: [{ code: 'CE4701', name: 'Estimation and Costing' }, { code: 'CE4702', name: 'Transportation Engineering' }],
  },
  CHEM: {
    1: [{ code: 'CH3151', name: 'Chemical Process Calculations' }, { code: 'CH3152', name: 'Engineering Chemistry' }],
    2: [{ code: 'CH3251', name: 'Fluid Mechanics for Chemical Engineers' }, { code: 'CH3252', name: 'Chemical Engineering Thermodynamics' }],
    3: [{ code: 'CH3401', name: 'Mass Transfer Operations' }, { code: 'CH3402', name: 'Chemical Reaction Engineering' }],
    4: [{ code: 'CH3701', name: 'Process Modeling and Simulation' }, { code: 'CH3702', name: 'Petroleum Refinery Engineering' }],
  },
  AIDS: {
    1: [{ code: 'AD3151', name: 'Fundamentals of Artificial Intelligence' }, { code: 'AD3152', name: 'Statistics for Data Science' }],
    2: [{ code: 'AD3251', name: 'Data Structures for AI' }, { code: 'AD3252', name: 'Machine Learning Fundamentals' }],
    3: [{ code: 'AD3491', name: 'Neural Networks and Deep Learning' }, { code: 'AD3492', name: 'Big Data Analytics' }],
    4: [{ code: 'AD3701', name: 'Natural Language Processing' }, { code: 'AD3702', name: 'Computer Vision' }],
  },
  BME: {
    1: [{ code: 'BM3151', name: 'Human Anatomy and Physiology' }, { code: 'BM3152', name: 'Circuit Theory' }],
    2: [{ code: 'BM3251', name: 'Biomedical Instrumentation' }, { code: 'BM3252', name: 'Sensors and Transducers' }],
    3: [{ code: 'BM3491', name: 'Medical Imaging Techniques' }, { code: 'BM3492', name: 'Biomechanics' }],
    4: [{ code: 'BM3701', name: 'Hospital Management Technology' }, { code: 'BM3702', name: 'Rehabilitation Engineering' }],
  },
  AUTO: {
    1: [{ code: 'AU3151', name: 'Automotive Engineering Materials' }, { code: 'AU3152', name: 'Engineering Mechanics' }],
    2: [{ code: 'AU3251', name: 'Automotive Chassis and Body Engineering' }, { code: 'AU3252', name: 'Thermodynamics' }],
    3: [{ code: 'AU3491', name: 'Automotive Engine Components' }, { code: 'AU3492', name: 'Vehicle Dynamics' }],
    4: [{ code: 'AU3701', name: 'Electric and Hybrid Vehicles' }, { code: 'AU3702', name: 'Automotive Electronics' }],
  },
  AERO: {
    1: [{ code: 'AE3151', name: 'Engineering Mechanics' }, { code: 'AE3152', name: 'Aerospace Materials' }],
    2: [{ code: 'AE3251', name: 'Aerodynamics I' }, { code: 'AE3252', name: 'Aircraft Structures I' }],
    3: [{ code: 'AE3391', name: 'Propulsion I' }, { code: 'AE3392', name: 'Flight Dynamics' }],
    4: [{ code: 'AE3701', name: 'Avionics' }, { code: 'AE3702', name: 'Aircraft Design' }],
  },
  MCT: {
    1: [{ code: 'MR3151', name: 'Engineering Mechanics' }, { code: 'MR3152', name: 'Basic Electrical and Electronics' }],
    2: [{ code: 'MR3251', name: 'Sensors and Actuators' }, { code: 'MR3252', name: 'Kinematics of Machinery' }],
    3: [{ code: 'MR3491', name: 'Robotics and Automation' }, { code: 'MR3492', name: 'Hydraulics and Pneumatics' }],
    4: [{ code: 'MR3701', name: 'Industrial Automation and PLC' }, { code: 'MR3702', name: 'Mechatronics System Design' }],
  },
};

// ---- University-common / basic-science subjects — same codes repeat across
// EVERY department for a given year, which is realistic (everyone takes
// Environmental Sciences, Python programming, Engineering Maths, etc.) ----
const COMMON_SUBJECTS = {
  1: [
    { code: 'MA3151', name: 'Matrices and Calculus' },
    { code: 'PH3151', name: 'Engineering Physics' },
    { code: 'CY3151', name: 'Engineering Chemistry' },
    { code: 'GE3151', name: 'Problem Solving and Python Programming' },
    { code: 'GE3152', name: 'Heritage of Tamil Nadu' },
  ],
  2: [
    { code: 'MA3251', name: 'Statistics and Numerical Methods' },
    { code: 'PH3256', name: 'Physics for Information Science' },
    { code: 'BE3251', name: 'Basic Electrical and Electronics Engineering' },
    { code: 'GE3251', name: 'Engineering Graphics' },
  ],
  3: [
    { code: 'GE3171', name: 'Environmental Sciences and Sustainability' },
    { code: 'MA3354', name: 'Discrete Mathematics' },
    { code: 'GE3361', name: 'Professional Communication' },
  ],
  4: [
    { code: 'UC3791', name: 'Universal Human Values' },
    { code: 'GE3791', name: 'Human Values and Ethics' },
    { code: 'UC3401', name: 'Constitution of India' },
  ],
};

const MATERIAL_TYPES = ['Notes', 'Question Paper', 'Study Material', 'Lab Manual', 'Previous Year QP'];

function randomRegNo() {
  const year = 2021 + Math.floor(Math.random() * 4); // 2021-2024 admission years
  const dept = 500 + Math.floor(Math.random() * 5);
  const roll = 100 + Math.floor(Math.random() * 900);
  return `${year}${dept}${roll}`;
}

function randomDateWithinLastYear() {
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  return new Date(now - Math.floor(Math.random() * oneYearMs));
}

function randomFileUrl(code, type) {
  const slug = `${code.toLowerCase()}-${type.replace(/\s+/g, '').toLowerCase()}-${Math.floor(Math.random() * 100000)}`;
  return Math.random() < 0.4
    ? `https://drive.google.com/file/d/mock-${slug}/view`
    : `https://res.cloudinary.com/demo/raw/upload/mock-materials/${slug}.pdf`;
}

function buildMaterials() {
  const materials = [];

  for (const dept of Object.keys(DEPARTMENT_SUBJECTS)) {
    for (const year of [1, 2, 3, 4]) {
      // Combine this department's own subjects with the shared common-subject
      // pool for that year, so codes like MA3151 / GE3151 / UC3791 show up
      // attached to materials from many different departments, not just one.
      const subjects = [...DEPARTMENT_SUBJECTS[dept][year], ...COMMON_SUBJECTS[year]];

      for (const subject of subjects) {
        for (const type of MATERIAL_TYPES) {
          if (Math.random() < 0.3) continue; // keeps counts varied, not every subject x type combo exists

          materials.push({
            uploaderRegNo: randomRegNo(),
            year,
            subjectCode: subject.code,
            title: `${subject.name} - ${type}`,
            fileUrl: randomFileUrl(subject.code, type),
            uploadDate: randomDateWithinLastYear(),
          });
        }
      }
    }
  }

  // Top up if random skipping left us short of a solid dataset size.
  const depts = Object.keys(DEPARTMENT_SUBJECTS);
  let i = 0;
  while (materials.length < 300) {
    const dept = depts[i % depts.length];
    const year = (i % 4) + 1;
    const pool = [...DEPARTMENT_SUBJECTS[dept][year], ...COMMON_SUBJECTS[year]];
    const subject = pool[i % pool.length];
    const type = MATERIAL_TYPES[i % MATERIAL_TYPES.length];
    materials.push({
      uploaderRegNo: randomRegNo(),
      year,
      subjectCode: subject.code,
      title: `${subject.name} - ${type} (Set ${Math.floor(i / 12) + 2})`,
      fileUrl: randomFileUrl(subject.code, `${type}${i}`),
      uploadDate: randomDateWithinLastYear(),
    });
    i++;
  }

  return materials;
}

async function seed() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set in .env — aborting.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const materials = buildMaterials();
  console.log(`Generated ${materials.length} mock materials across ${Object.keys(DEPARTMENT_SUBJECTS).length} departments and shared common-subject codes.`);

  await Material.deleteMany({}); // comment this out if you want to keep existing entries
  await Material.insertMany(materials);
  console.log(`Inserted ${materials.length} materials into the database.`);

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
