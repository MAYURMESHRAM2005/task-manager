const mongoose = require('mongoose');

// Use in-memory MongoDB for tests
// We'll use a test URI that points to a local MongoDB or mock
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow_test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up test data
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  await mongoose.disconnect();
});

// Clear all collections between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
