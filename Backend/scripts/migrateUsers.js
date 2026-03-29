// Script migrate users từ collection 'users' sang 'userprofiles'
const mongoose = require('mongoose');
const User = require('../src/models/user');
const UserProfile = require('../src/models/UserProfile');
require('dotenv').config();

async function migrateUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Lấy tất cả users từ collection cũ
        const oldUsers = await User.find({});
        console.log(`Found ${oldUsers.length} users in 'users' collection`);

        let migrated = 0;
        let skipped = 0;

        for (const oldUser of oldUsers) {
            // Kiểm tra đã có trong userprofiles chưa
            const existing = await UserProfile.findOne({ supabaseId: oldUser.supabaseId });
            
            if (existing) {
                console.log(`Skipping ${oldUser.email} - already exists in userprofiles`);
                skipped++;
                continue;
            }

            // Tạo profile mới
            const newProfile = new UserProfile({
                supabaseId: oldUser.supabaseId,
                email: oldUser.email,
                username: oldUser.email.split('@')[0],
                role: 'user', // Default role
                status: 'active',
                coins: 0
            });

            await newProfile.save();
            console.log(`Migrated: ${oldUser.email}`);
            migrated++;
        }

        const totalProfiles = await UserProfile.countDocuments();
        console.log('\n✅ Migration completed!');
        console.log(`Migrated: ${migrated}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Total in userprofiles: ${totalProfiles}`);
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateUsers();
