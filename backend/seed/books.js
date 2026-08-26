const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Book = require('../models/Book');

const SUBJECTS_CONFIG = [
  // CSE / IT Subjects
  {
    code: 'CS23302',
    name: 'Operating Systems',
    category: 'CSE',
    books: [
      { title: 'Operating System Concepts (Silberschatz Dinosaur Book)', author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne' },
      { title: 'Modern Operating Systems (4th Edition)', author: 'Andrew S. Tanenbaum, Herbert Bos' },
      { title: 'Operating Systems: Three Easy Pieces (OSTEP)', author: 'Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau' },
      { title: 'Operating Systems: Internals and Design Principles', author: 'William Stallings' },
      { title: 'The Linux Programming Interface', author: 'Michael Kerrisk' },
      { title: 'Design of the UNIX Operating System', author: 'Maurice J. Bach' },
      { title: 'Understanding the Linux Kernel', author: 'Daniel P. Bovet, Marco Cesati' },
      { title: 'Hands-On Operating Systems with Rust', author: 'Claus Matzinger' },
    ],
  },
  {
    code: 'CS23101',
    name: 'Data Structures and Algorithms',
    category: 'CSE',
    books: [
      { title: 'Introduction to Algorithms (CLRS 4th Edition)', author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein' },
      { title: 'Data Structures and Algorithm Analysis in C++', author: 'Mark Allen Weiss' },
      { title: 'Data Structures and Algorithms in Java', author: 'Robert Lafore' },
      { title: 'Algorithms (4th Edition)', author: 'Robert Sedgewick, Kevin Wayne' },
      { title: 'The Algorithm Design Manual', author: 'Steven S. Skiena' },
      { title: 'Grokking Algorithms: An Illustrated Guide', author: 'Aditya Bhargava' },
      { title: 'Data Structures and Algorithms in Python', author: 'Michael T. Goodrich, Roberto Tamassia, Michael H. Goldwasser' },
      { title: 'Advanced Data Structures and Graph Algorithms', author: 'Peter Brass' },
    ],
  },
  {
    code: 'CS23204',
    name: 'Database Management Systems',
    category: 'CSE',
    books: [
      { title: 'Database System Concepts (7th Edition)', author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan' },
      { title: 'Fundamentals of Database Systems', author: 'Ramez Elmasri, Shamkant B. Navathe' },
      { title: 'Database Management Systems (Cow Book)', author: 'Raghu Ramakrishnan, Johannes Gehrke' },
      { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann' },
      { title: 'High Performance MySQL: Optimization and Architectures', author: 'Silvia Botros, Jeremy Tinley' },
      { title: 'NoSQL Distilled: A Brief Guide to Polyglot Persistence', author: 'Pramod J. Sadalage, Martin Fowler' },
      { title: 'PostgreSQL: Up and Running', author: 'Regina Obe, Leo Hsu' },
      { title: 'Database Internals: A Deep Dive into Distributed Systems', author: 'Alex Petrov' },
    ],
  },
  {
    code: 'CS23405',
    name: 'Computer Networks',
    category: 'CSE',
    books: [
      { title: 'Computer Networking: A Top-Down Approach', author: 'James F. Kurose, Keith W. Ross' },
      { title: 'Computer Networks (5th Edition)', author: 'Andrew S. Tanenbaum, David J. Wetherall' },
      { title: 'TCP/IP Illustrated, Volume 1: The Protocols', author: 'W. Richard Stevens, Kevin R. Fall' },
      { title: 'Data Communications and Networking', author: 'Behrouz A. Forouzan' },
      { title: 'Network Warrior: Everything You Need to Know', author: 'Gary A. Donahue' },
      { title: 'High Performance Browser Networking', author: 'Ilya Grigorik' },
      { title: 'Cloud Networking Architecture and SDN Essentials', author: 'Gary Lee' },
    ],
  },
  {
    code: 'CS23502',
    name: 'Compiler Design',
    category: 'CSE',
    books: [
      { title: 'Compilers: Principles, Techniques, and Tools (Dragon Book)', author: 'Alfred V. Aho, Monica S. Lam, Ravi Sethi, Jeffrey D. Ullman' },
      { title: 'Engineering a Compiler', author: 'Keith D. Cooper, Linda Torczon' },
      { title: 'Modern Compiler Implementation in Java', author: 'Andrew W. Appel' },
      { title: 'Crafting Interpreters', author: 'Robert Nystrom' },
      { title: 'Writing An Interpreter In Go', author: 'Thorsten Ball' },
      { title: 'Parsing Techniques: A Practical Guide', author: 'Dick Grune, Ceriel J.H. Jacobs' },
    ],
  },
  {
    code: 'IT23105',
    name: 'Web Technologies and Cloud Computing',
    category: 'IT',
    books: [
      { title: 'Full Stack Development with React, Node.js and MongoDB', author: 'Vasan Subramanian' },
      { title: 'Learning React: Modern Patterns for Developing React Apps', author: 'Alex Banks, Eve Porcello' },
      { title: 'Cloud Computing: Concepts, Technology & Architecture', author: 'Thomas Erl, Ricardo Puttini, Zaigham Mahmood' },
      { title: 'Kubernetes in Action', author: 'Marko Luksa' },
      { title: 'Docker Deep Dive', author: 'Nigel Poulton' },
      { title: 'Designing Web APIs: Building APIs That Developers Love', author: 'Brenda Jin, Saurabh Sahni, Amir Shevat' },
      { title: 'Microservices Patterns: With examples in Java', author: 'Chris Richardson' },
    ],
  },
  {
    code: 'AI23101',
    name: 'Artificial Intelligence & Machine Learning',
    category: 'AI-DS',
    books: [
      { title: 'Artificial Intelligence: A Modern Approach (4th Edition)', author: 'Stuart Russell, Peter Norvig' },
      { title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', author: 'Aurélien Géron' },
      { title: 'Pattern Recognition and Machine Learning', author: 'Christopher M. Bishop' },
      { title: 'Deep Learning (Adaptive Computation and Machine Learning series)', author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville' },
      { title: 'The Elements of Statistical Learning', author: 'Trevor Hastie, Robert Tibshirani, Jerome Friedman' },
      { title: 'Reinforcement Learning: An Introduction', author: 'Richard S. Sutton, Andrew G. Barto' },
      { title: 'Natural Language Processing with Transformers', author: 'Lewis Tunstall, Leandro von Werra, Thomas Wolf' },
      { title: 'Speech and Language Processing (3rd Edition Draft)', author: 'Daniel Jurafsky, James H. Martin' },
    ],
  },

  // ECE / EEE Subjects
  {
    code: 'EC22401',
    name: 'Digital Electronics and Logic Design',
    category: 'ECE',
    books: [
      { title: 'Digital Design: With an Introduction to the Verilog HDL', author: 'M. Morris Mano, Michael D. Ciletti' },
      { title: 'Digital Fundamentals (11th Edition)', author: 'Thomas L. Floyd' },
      { title: 'Modern Digital Electronics', author: 'R. P. Jain' },
      { title: 'Digital Integrated Circuits: A Design Perspective', author: 'Jan M. Rabaey, Anantha Chandrakasan, Borivoje Nikolic' },
      { title: 'Fundamentals of Logic Design', author: 'Charles H. Roth Jr., Larry L. Kinney' },
      { title: 'Digital Principles and Applications', author: 'Donald P. Leach, Albert Paul Malvino, Goutam Saha' },
      { title: 'CMOS VLSI Design: A Circuits and Systems Perspective', author: 'Neil H.E. Weste, David Money Harris' },
    ],
  },
  {
    code: 'EC22302',
    name: 'Digital Signal Processing',
    category: 'ECE',
    books: [
      { title: 'Digital Signal Processing: Principles, Algorithms and Applications', author: 'John G. Proakis, Dimitris G. Manolakis' },
      { title: 'Discrete-Time Signal Processing (3rd Edition)', author: 'Alan V. Oppenheim, Ronald W. Schafer' },
      { title: 'Signals and Systems', author: 'Alan V. Oppenheim, Alan S. Willsky, S. Hamid Nawab' },
      { title: 'Digital Signal Processing: A Computer-Based Approach', author: 'Sanjit K. Mitra' },
      { title: 'Understanding Digital Signal Processing', author: 'Richard G. Lyons' },
      { title: 'DSP Applications using C and the TMS320C6x DSK', author: 'Rulph Chassaing' },
    ],
  },
  {
    code: 'EC22503',
    name: 'Microprocessors and Embedded Systems',
    category: 'ECE',
    books: [
      { title: 'Microprocessor Architecture, Programming, and Applications with the 8085', author: 'Ramesh S. Gaonkar' },
      { title: 'The 8051 Microcontroller and Embedded Systems', author: 'Muhammad Ali Mazidi, Janice Gillispie Mazidi, Rolin D. McKinlay' },
      { title: 'ARM System Developer’s Guide: Designing and Optimizing System Software', author: 'Andrew N. Sloss, Dominic Symes, Chris Wright' },
      { title: 'Making Embedded Systems: Design Patterns for Great Software', author: 'Elecia White' },
      { title: 'Embedded Systems: Real-Time Interfacing to ARM Cortex-M Microcontrollers', author: 'Jonathan W. Valvano' },
      { title: 'Programming Embedded Systems in C and C++', author: 'Michael Barr, Anthony Massa' },
    ],
  },
  {
    code: 'EE22101',
    name: 'Electric Circuits and Power Systems',
    category: 'EEE',
    books: [
      { title: 'Engineering Circuit Analysis', author: 'William H. Hayt, Jack E. Kemmerly, Steven M. Durbin' },
      { title: 'Fundamentals of Electric Circuits', author: 'Charles K. Alexander, Matthew N. O. Sadiku' },
      { title: 'Power System Analysis and Design', author: 'J. Duncan Glover, Thomas Overbye, Mulukutla S. Sarma' },
      { title: 'Electrical Machinery (7th Edition)', author: 'P. S. Bimbhra' },
      { title: 'Power Electronics: Circuits, Devices, and Applications', author: 'Muhammad H. Rashid' },
      { title: 'Modern Power System Analysis', author: 'I. J. Nagrath, D. P. Kothari' },
    ],
  },

  // Mechanical / Civil Subjects
  {
    code: 'ME21503',
    name: 'Thermodynamics and Heat Transfer',
    category: 'Mechanical',
    books: [
      { title: 'Thermodynamics: An Engineering Approach', author: 'Yunus A. Cengel, Michael A. Boles, Mehmet Kanoglu' },
      { title: 'Fundamentals of Engineering Thermodynamics', author: 'Michael J. Moran, Howard N. Shapiro, Daisie D. Boettner' },
      { title: 'Heat and Mass Transfer: Fundamentals and Applications', author: 'Yunus A. Cengel, Afshin J. Ghajar' },
      { title: 'Fundamentals of Heat and Mass Transfer', author: 'Theodore L. Bergman, Adrienne S. Lavine, Frank P. Incropera' },
      { title: 'Internal Combustion Engines: Applied Thermosciences', author: 'Colin R. Ferguson, Allan T. Kirkpatrick' },
      { title: 'Engineering Thermodynamics', author: 'P. K. Nag' },
      { title: 'Thermal Physics and Engineering Applications', author: 'Charles Kittel, Herbert Kroemer' },
    ],
  },
  {
    code: 'ME21402',
    name: 'Fluid Mechanics and Machine Design',
    category: 'Mechanical',
    books: [
      { title: 'Fluid Mechanics (8th Edition)', author: 'Frank M. White, Henry Xue' },
      { title: 'Introduction to Fluid Mechanics', author: 'Robert W. Fox, Alan T. McDonald, Philip J. Pritchard' },
      { title: 'Shigley’s Mechanical Engineering Design', author: 'Richard G. Budynas, J. Keith Nisbett' },
      { title: 'Design of Machine Elements', author: 'V. B. Bhandari' },
      { title: 'Theory of Machines and Mechanisms', author: 'John J. Uicker Jr., Gordon R. Pennock, Joseph E. Shigley' },
      { title: 'Mechanics of Materials (10th Edition in SI Units)', author: 'Russell C. Hibbeler' },
    ],
  },
  {
    code: 'CE21201',
    name: 'Structural Analysis and Concrete Technology',
    category: 'Civil',
    books: [
      { title: 'Structural Analysis (9th Edition)', author: 'Russell C. Hibbeler' },
      { title: 'Theory of Structures (Vol 1 & 2)', author: 'S. Ramamrutham, R. Narayan' },
      { title: 'Reinforced Concrete Design', author: 'S. Unnikrishna Pillai, Devdas Menon' },
      { title: 'Concrete Technology: Theory and Practice', author: 'M. S. Shetty, A. K. Jain' },
      { title: 'Soil Mechanics and Foundations', author: 'B. C. Punmia, Ashok Kumar Jain, Arun Kumar Jain' },
      { title: 'Surveying and Levelling (Vol 1 & 2)', author: 'N. N. Basak' },
    ],
  },

  // Applied Sciences & Mathematics (Crucial for testing "physics" vs "engineering physics", etc.)
  {
    code: 'PH21101',
    name: 'Engineering Physics',
    category: 'Physics',
    books: [
      { title: 'Engineering Physics (Core Course for B.Tech)', author: 'H. K. Malik, A. K. Singh' },
      { title: 'Textbook of Engineering Physics', author: 'V. Rajendran' },
      { title: 'Concepts of Modern Physics (6th Edition)', author: 'Arthur Beiser, Shobhit Mahajan, S. Rai Choudhury' },
      { title: 'Solid State Physics (Essential Reference)', author: 'Neil W. Ashcroft, N. David Mermin' },
      { title: 'Introduction to Solid State Physics (8th Edition)', author: 'Charles Kittel' },
      { title: 'Fundamentals of Physics (Halliday & Resnick)', author: 'David Halliday, Robert Resnick, Jearl Walker' },
      { title: 'University Physics with Modern Physics', author: 'Hugh D. Young, Roger A. Freedman' },
      { title: 'Optics and Photonics for Engineers', author: 'Eugene Hecht' },
      { title: 'Physics for Scientists and Engineers with Modern Physics', author: 'Raymond A. Serway, John W. Jewett' },
      { title: 'Quantum Physics of Atoms, Molecules, Solids, Nuclei, and Particles', author: 'Robert Eisberg, Robert Resnick' },
    ],
  },
  {
    code: 'PH21202',
    name: 'Semiconductor Physics & Nanotechnology',
    category: 'Physics',
    books: [
      { title: 'Semiconductor Physics and Devices: Basic Principles', author: 'Donald A. Neamen' },
      { title: 'Physics of Semiconductor Devices', author: 'S. M. Sze, Kwok K. Ng' },
      { title: 'Introduction to Nanotechnology', author: 'Charles P. Poole Jr., Frank J. Owens' },
      { title: 'Nanotechnology: Principles and Practices', author: 'Sulabha K. Kulkarni' },
      { title: 'Modern Semiconductor Devices for Integrated Circuits', author: 'Chenming Hu' },
    ],
  },
  {
    code: 'MA21101',
    name: 'Engineering Mathematics I - Calculus & Linear Algebra',
    category: 'Mathematics',
    books: [
      { title: 'Higher Engineering Mathematics (44th Edition)', author: 'B. S. Grewal' },
      { title: 'Advanced Engineering Mathematics (10th Edition)', author: 'Erwin Kreyszig' },
      { title: 'Linear Algebra and Its Applications (5th Edition)', author: 'Gilbert Strang' },
      { title: 'Introduction to Linear Algebra', author: 'Gilbert Strang' },
      { title: 'Thomas’ Calculus: Early Transcendentals', author: 'Joel R. Hass, Christopher E. Heil, Maurice D. Weir' },
      { title: 'Calculus: Early Transcendentals', author: 'James Stewart' },
      { title: 'A Course in Multivariable Calculus and Analysis', author: 'Sudhir R. Ghorpade, Balmohan V. Limaye' },
    ],
  },
  {
    code: 'MA21202',
    name: 'Engineering Mathematics II - Differential Equations & Complex Analysis',
    category: 'Mathematics',
    books: [
      { title: 'Advanced Engineering Mathematics', author: 'Dennis G. Zill, Warren S. Wright' },
      { title: 'Differential Equations with Applications and Historical Notes', author: 'George F. Simmons' },
      { title: 'Complex Variables and Applications (9th Edition)', author: 'James Ward Brown, Ruel V. Churchill' },
      { title: 'Probability, Random Variables and Stochastic Processes', author: 'Athanasios Papoulis, S. Unnikrishna Pillai' },
      { title: 'Probability and Statistics for Engineers and Scientists', author: 'Ronald E. Walpole, Raymond H. Myers, Sharon L. Myers' },
      { title: 'Numerical Methods for Engineers', author: 'Steven C. Chapra, Raymond P. Canale' },
    ],
  },
  {
    code: 'CY21102',
    name: 'Engineering Chemistry & Materials Science',
    category: 'Chemistry',
    books: [
      { title: 'Engineering Chemistry (All India Edition)', author: 'P. C. Jain, Monika Jain' },
      { title: 'Textbook of Engineering Chemistry', author: 'S. S. Dara, S. S. Umare' },
      { title: 'Materials Science and Engineering: An Introduction', author: 'William D. Callister Jr., David G. Rethwisch' },
      { title: 'Polymer Science and Technology', author: 'Robert O. Ebewele' },
      { title: 'Environmental Chemistry for Engineering', author: 'Stanley E. Manahan' },
    ],
  },
  {
    code: 'HS21101',
    name: 'Professional Ethics & Soft Skills',
    category: 'Humanities',
    books: [
      { title: 'Engineering Ethics: Concepts and Cases', author: 'Charles E. Harris Jr., Michael S. Pritchard, Michael J. Rabins' },
      { title: 'Ethics in Engineering (4th Edition)', author: 'Mike W. Martin, Roland Schinzinger' },
      { title: 'Technical Communication: Principles and Practice', author: 'Meenakshi Raman, Sangeeta Sharma' },
      { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey' },
    ],
  },
];

// Helper to generate realistic shelf locations: format [A-F]-[1-9]
function generateShelfLocation(categoryIndex, itemIndex) {
  const aisles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const aisle = aisles[categoryIndex % aisles.length];
  const shelfNum = (itemIndex % 8) + 1;
  return `${aisle}-${shelfNum}`;
}

// Generate ~500 books by creating varied editions, volumes, lab manuals, and specialized prints
function generateSeedDataset() {
  const booksToInsert = [];
  let bookCounter = 0;

  const EDITIONS = [
    '',
    ' (Student Edition)',
    ' (International Edition)',
    ' (Volume 1: Fundamentals)',
    ' (Volume 2: Advanced Topics)',
    ' (Laboratory Manual & Practical Guide)',
    ' (Solution Manual & Problem Solver)',
    ' (Exam Preparation & Question Bank)',
    ' (Revised 2026 Edition)',
  ];

  SUBJECTS_CONFIG.forEach((subject, subjIdx) => {
    subject.books.forEach((baseBook, bookIdx) => {
      // For each base book, produce 3-4 variants (main copy, student edition, lab manual, etc.)
      const variantCount = subjIdx % 2 === 0 ? 4 : 3;

      for (let v = 0; v < variantCount; v++) {
        bookCounter++;
        const editionSuffix = EDITIONS[v % EDITIONS.length];
        const title = `${baseBook.title}${editionSuffix}`.trim();

        // Realistic quantities
        // Some with high stock, some moderate stock, and ~10% out-of-stock (availableQuantity = 0)
        let totalQuantity;
        let availableQuantity;

        if (bookCounter % 9 === 0) {
          // Out of stock case
          totalQuantity = Math.floor(Math.random() * 5) + 2; // 2 to 6
          availableQuantity = 0;
        } else if (bookCounter % 5 === 0) {
          // Low stock case
          totalQuantity = Math.floor(Math.random() * 6) + 4; // 4 to 9
          availableQuantity = 1;
        } else {
          // Normal availability
          totalQuantity = Math.floor(Math.random() * 8) + 4; // 4 to 11
          availableQuantity = Math.floor(Math.random() * (totalQuantity - 1)) + 2; // 2 to totalQuantity
        }

        const shelfLocation = generateShelfLocation(subjIdx, bookCounter);

        booksToInsert.push({
          title,
          author: baseBook.author,
          subjectCode: subject.code,
          category: subject.category,
          totalQuantity,
          availableQuantity,
          shelfLocation,
        });
      }
    });
  });

  // If we need extra books to reliably reach ~500 items, supplement with specialized monographs
  const EXTRA_BRANCHES = [
    { cat: 'CSE', prefix: 'CS23', titleP: 'Advanced Concepts in ', codes: ['CS23601', 'CS23702', 'CS23803'] },
    { cat: 'ECE', prefix: 'EC22', titleP: 'Practical Guide to ', codes: ['EC22601', 'EC22702', 'EC22803'] },
    { cat: 'Mechanical', prefix: 'ME21', titleP: 'Handbook of ', codes: ['ME21601', 'ME21702', 'ME21803'] },
    { cat: 'Civil', prefix: 'CE21', titleP: 'Modern Methods in ', codes: ['CE21601', 'CE21702', 'CE21803'] },
    { cat: 'Physics', prefix: 'PH21', titleP: 'Frontiers in ', codes: ['PH21301', 'PH21402', 'PH21503'] },
    { cat: 'Mathematics', prefix: 'MA21', titleP: 'Applied Methods in ', codes: ['MA21301', 'MA21402', 'MA21503'] },
  ];

  const TOPICS = [
    'Graph Theory & Combinatorics',
    'Quantum Computing Architectures',
    'Cyber Physical Systems',
    'Robotics & Motion Planning',
    'Satellite Communication Engineering',
    'Renewable Energy Integration',
    'Finite Element Analysis',
    'Aerodynamics and Propulsion',
    'Transportation and Highway Engineering',
    'Geotechnical Hazard Mitigation',
    'Laser Optics and Holography',
    'Computational Fluid Dynamics',
    'Statistical Mechanics & Thermodynamics',
    'Cryptography & Blockchain Security',
    'Autonomous Vehicle Navigation',
    'Bio-Medical Instrumentation',
  ];

  const AUTHORS = [
    'Dr. K. R. Venugopal, L. M. Patnaik',
    'Prof. S. K. Bhattacharya',
    'Dr. Arpit Sharma, Dr. Sunita Rao',
    'R. K. Rajput',
    'B. L. Theraja, A. K. Theraja',
    'Dr. A. P. Verma',
    'P. N. Modi, S. M. Seth',
    'Dr. Sanjay Sharma',
    'Prof. D. S. Kumar',
    'Dr. H. S. Bawa',
  ];

  let topicIndex = 0;
  while (booksToInsert.length < 500) {
    const branch = EXTRA_BRANCHES[booksToInsert.length % EXTRA_BRANCHES.length];
    const code = branch.codes[booksToInsert.length % branch.codes.length];
    const topic = TOPICS[topicIndex % TOPICS.length];
    const author = AUTHORS[booksToInsert.length % AUTHORS.length];
    topicIndex++;

    const isOutOfStock = booksToInsert.length % 8 === 0;
    const totalQuantity = Math.floor(Math.random() * 7) + 3;
    const availableQuantity = isOutOfStock ? 0 : Math.floor(Math.random() * (totalQuantity - 1)) + 1;
    const shelfLocation = generateShelfLocation(booksToInsert.length, topicIndex);

    booksToInsert.push({
      title: `${branch.titleP}${topic}`,
      author,
      subjectCode: code,
      category: branch.cat,
      totalQuantity,
      availableQuantity,
      shelfLocation,
    });
  }

  return booksToInsert;
}

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is missing from environment variables (.env)');
    }

    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing book collection
    const deleted = await Book.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing books from collection.`);

    const dataset = generateSeedDataset();
    console.log(`Generated ${dataset.length} mock engineering books dataset.`);

    const inserted = await Book.insertMany(dataset);
    console.log(`Successfully seeded ${inserted.length} books into MongoDB database!`);

    // Verify index creation
    await Book.syncIndexes();
    console.log('Database indexes synchronized.');

    console.log('\n--- SAMPLE SEEDED RECORDS ---');
    console.log(
      dataset.slice(0, 5).map((b) => ({
        title: b.title,
        author: b.author,
        subjectCode: b.subjectCode,
        category: b.category,
        available: `${b.availableQuantity}/${b.totalQuantity}`,
        shelfLocation: b.shelfLocation,
      }))
    );

    console.log('\nSeeding complete. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
}

// Execute seed if run directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { generateSeedDataset, seedDatabase };
