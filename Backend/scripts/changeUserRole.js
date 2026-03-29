// Script để đổi role của user trong MongoDB
// Usage: node scripts/changeUserRole.js <email> <new_role>
// Example: node scripts/changeUserRole.js ttoann208@gmail.com user

const mongoose = require('mongoose');
const UserProfile = require('../src/models/UserProfile');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/truyen'; // Cập nhật URI phù hợp

async function changeUserRole() {
    const email = process.argv[2];
    const newRole = process.argv[3];
    
    if (!email || !newRole) {
        console.log('Usage: node scripts/changeUserRole.js <email> <new_role>');
        console.log('Example: node scripts/changeUserRole.js ttoann208@gmail.com user');
        process.exit(1);
    }
    
    if (!['user', 'host', 'admin'].includes(newRole)) {
        console.log('Error: Role phải là user, host, hoặc admin');
        process.exit(1);
    }
    
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI);
        console.log(`Connected to MongoDB`);
        
        // Tìm user theo email
        console.log(`\nFinding user with email: ${email}`);
        const user = await UserProfile.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            
            // Liệt kê tất cả users để debug
            console.log(`\nAll users in database:`);
            const allUsers = await UserProfile.find({}).select('email role supabaseId');
            allUsers.forEach(u => {
                console.log(`  - ${u.email}: ${u.role} (${u.supabaseId})`);
            });
            
            await mongoose.disconnect();
            process.exit(1);
        }
        
        console.log(`✅ User found:`);
        console.log(`  - ID: ${user._id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - SupabaseId: ${user.supabaseId}`);
        console.log(`  - Current Role: ${user.role}`);
        console.log(`  - New Role: ${newRole}`);
        
        // Update role
        const oldRole = user.role;
        user.role = newRole;
        await user.save();
        
        console.log(`\n✅ Role updated successfully!`);
        console.log(`  - ${email}: ${oldRole} → ${newRole}`);
        
        // Verify
        const updated = await UserProfile.findOne({ email: email.toLowerCase() });
        console.log(`\nVerification:`);
        console.log(`  - Current role in DB: ${updated.role}`);
        
        await mongoose.disconnect();
        console.log(`\nDisconnected from MongoDB`);
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

changeUserRole();
