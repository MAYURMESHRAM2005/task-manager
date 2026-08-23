const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Team = require('../models/Team');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});
    await Team.deleteMany({});

    // Create users
    const admin = await User.create({ name: 'Admin User', email: 'admin@taskflow.com', password: 'admin123', role: 'ADMIN' });
    const manager = await User.create({ name: 'Manager User', email: 'manager@taskflow.com', password: 'manager123', role: 'MANAGER' });
    const user1 = await User.create({ name: 'John Developer', email: 'john@taskflow.com', password: 'john123', role: 'USER' });
    const user2 = await User.create({ name: 'Jane Designer', email: 'jane@taskflow.com', password: 'jane123', role: 'USER' });

    console.log('Users created');

    // Create projects
    const proj1 = await Project.create({ name: 'Website Redesign', description: 'Complete website redesign project', owner: manager._id, status: 'ACTIVE', members: [{ user: manager._id, role: 'OWNER' }, { user: user1._id, role: 'MEMBER' }, { user: user2._id, role: 'MEMBER' }] });
    const proj2 = await Project.create({ name: 'Mobile App', description: 'Build mobile application', owner: admin._id, status: 'PLANNED', members: [{ user: admin._id, role: 'OWNER' }, { user: user1._id, role: 'MEMBER' }] });

    console.log('Projects created');

    // Create tasks
    const tasks = [
      { title: 'Design landing page', description: 'Create wireframes and mockups', status: 'COMPLETED', priority: 'HIGH', createdBy: manager._id, assignedTo: user2._id, project: proj1._id, completedAt: new Date() },
      { title: 'Implement API endpoints', description: 'Build REST API for tasks module', status: 'IN_PROGRESS', priority: 'HIGH', createdBy: manager._id, assignedTo: user1._id, project: proj1._id },
      { title: 'Write unit tests', description: 'Cover all API endpoints with tests', status: 'TODO', priority: 'MEDIUM', createdBy: user1._id, assignedTo: user1._id, project: proj1._id },
      { title: 'Setup Docker', description: 'Create Dockerfile and docker-compose.yml', status: 'COMPLETED', priority: 'URGENT', createdBy: admin._id, assignedTo: user1._id, project: proj1._id, completedAt: new Date() },
      { title: 'Design database schema', description: 'Design MongoDB collections', status: 'TODO', priority: 'HIGH', createdBy: admin._id, assignedTo: user1._id, project: proj2._id },
      { title: 'Create wireframes for mobile', description: 'Design mobile app screens', status: 'TODO', priority: 'MEDIUM', createdBy: admin._id, assignedTo: user2._id, project: proj2._id },
      { title: 'Setup CI/CD pipeline', description: 'Configure Jenkins pipeline', status: 'IN_PROGRESS', priority: 'URGENT', createdBy: admin._id, assignedTo: user1._id, project: proj1._id },
      { title: 'Update documentation', description: 'Update README and API docs', status: 'TODO', priority: 'LOW', createdBy: manager._id, assignedTo: user2._id, project: proj1._id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    ];

    for (const t of tasks) { await Task.create(t); }
    console.log('Tasks created');

    // Create teams
    await Team.create({ name: 'Engineering', description: 'Engineering team', owner: manager._id, members: [{ user: manager._id, role: 'OWNER' }, { user: user1._id, role: 'MEMBER' }] });
    await Team.create({ name: 'Design', description: 'Design team', owner: user2._id, members: [{ user: user2._id, role: 'OWNER' }] });

    console.log('Teams created');
    console.log('\nSeed completed! Demo accounts:');
    console.log('Admin: admin@taskflow.com / admin123');
    console.log('Manager: manager@taskflow.com / manager123');
    console.log('User: john@taskflow.com / john123');
    console.log('User: jane@taskflow.com / jane123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
