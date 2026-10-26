const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Seed initial mock data for immediate out-of-the-box demonstration.
 */
async function seedData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    console.log('Seeding demo users, groups, and expenses...');

    // 1. Create Users
    const alice = await User.create({
      name: 'Alice Chen',
      email: 'alice@test.com',
      password: 'password123',
    });

    const bob = await User.create({
      name: 'Bob Smith',
      email: 'bob@test.com',
      password: 'password123',
    });

    const charlie = await User.create({
      name: 'Charlie Davis',
      email: 'charlie@test.com',
      password: 'password123',
    });

    const diana = await User.create({
      name: 'Diana Prince',
      email: 'diana@test.com',
      password: 'password123',
    });

    // 2. Create Groups
    const tripGroup = await Group.create({
      name: 'Euro Trip 2024',
      description: 'Summer vacation across Italy & France',
      members: [alice._id, bob._id, charlie._id, diana._id],
      createdBy: alice._id,
    });

    const aptGroup = await Group.create({
      name: 'Downtown Apartment',
      description: 'Monthly rent, groceries, and utilities',
      members: [alice._id, bob._id],
      createdBy: alice._id,
    });

    // 3. Create Expenses for Euro Trip
    // Expense 1: Airbnb ($840.00 = 84000 cents) paid by Alice, split equal
    await Expense.create({
      group: tripGroup._id,
      description: 'Airbnb Villa in Rome',
      amount: 84000,
      category: 'housing',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      paidBy: [{ user: alice._id, amount: 84000 }],
      splits: [
        { user: alice._id, amount: 21000 },
        { user: bob._id, amount: 21000 },
        { user: charlie._id, amount: 21000 },
        { user: diana._id, amount: 21000 },
      ],
      splitType: 'equal',
      createdBy: alice._id,
    });

    // Expense 2: Dinner ($180.00 = 18000 cents) paid by Bob, split equal
    await Expense.create({
      group: tripGroup._id,
      description: 'Dinner at Trattoria da Enzo',
      amount: 18000,
      category: 'food',
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      paidBy: [{ user: bob._id, amount: 18000 }],
      splits: [
        { user: alice._id, amount: 4500 },
        { user: bob._id, amount: 4500 },
        { user: charlie._id, amount: 4500 },
        { user: diana._id, amount: 4500 },
      ],
      splitType: 'equal',
      createdBy: bob._id,
    });

    // Expense 3: Colosseum Passes ($120.00 = 12000 cents) paid by Charlie, split equal
    await Expense.create({
      group: tripGroup._id,
      description: 'Colosseum & Vatican Tour Passes',
      amount: 12000,
      category: 'entertainment',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      paidBy: [{ user: charlie._id, amount: 12000 }],
      splits: [
        { user: alice._id, amount: 3000 },
        { user: bob._id, amount: 3000 },
        { user: charlie._id, amount: 3000 },
        { user: diana._id, amount: 3000 },
      ],
      splitType: 'equal',
      createdBy: charlie._id,
    });

    // Expense 4: Train ($160.00 = 16000 cents) paid by Diana, split equal
    await Expense.create({
      group: tripGroup._id,
      description: 'High-speed Train to Florence',
      amount: 16000,
      category: 'transport',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      paidBy: [{ user: diana._id, amount: 16000 }],
      splits: [
        { user: alice._id, amount: 4000 },
        { user: bob._id, amount: 4000 },
        { user: charlie._id, amount: 4000 },
        { user: diana._id, amount: 4000 },
      ],
      splitType: 'equal',
      createdBy: diana._id,
    });

    // 4. Create Settlement in Euro Trip
    // Bob paid Alice $50.00 (5000 cents)
    await Settlement.create({
      group: tripGroup._id,
      from: bob._id,
      to: alice._id,
      amount: 5000,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdBy: bob._id,
    });

    // 5. Create Expenses for Apartment
    await Expense.create({
      group: aptGroup._id,
      description: 'Monthly Apartment Rent',
      amount: 220000,
      category: 'housing',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paidBy: [{ user: alice._id, amount: 220000 }],
      splits: [
        { user: alice._id, amount: 110000 },
        { user: bob._id, amount: 110000 },
      ],
      splitType: 'equal',
      createdBy: alice._id,
    });

    await Expense.create({
      group: aptGroup._id,
      description: 'Fiber Gigabit Internet',
      amount: 8000,
      category: 'utilities',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      paidBy: [{ user: bob._id, amount: 8000 }],
      splits: [
        { user: alice._id, amount: 4000 },
        { user: bob._id, amount: 4000 },
      ],
      splitType: 'equal',
      createdBy: bob._id,
    });

    console.log('Seed completed successfully!');
    console.log('Demo Login credentials:');
    console.log('  Email: alice@test.com  | Password: password123');
    console.log('  Email: bob@test.com    | Password: password123');
    console.log('  Email: charlie@test.com| Password: password123');
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

module.exports = seedData;
