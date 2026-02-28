/**
 * Seed script to create the initial super admin user.
 * Usage: npm run seed:admin
 */

const API_URL = process.env.API_URL || 'http://localhost:6700/api/v1';

async function seedAdmin() {
  console.log('🌱 Seeding admin user...\n');

  try {
    const response = await fetch(`${API_URL}/admin/auth/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'venkatesh.g3498@gmail.com',
        password: 'Test@1234',
        name: 'Venkatesh',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Super admin created successfully!');
      console.log(`   Email: ${data.admin.email}`);
      console.log(`   Name:  ${data.admin.name}`);
      console.log(`   Role:  ${data.admin.role}`);
      console.log(`   ID:    ${data.admin.id}`);
    } else if (response.status === 409) {
      console.log('ℹ️  Admin user already exists. Seed skipped.');
    } else {
      console.error('❌ Failed to seed admin:', data.message || JSON.stringify(data));
    }
  } catch (error: any) {
    console.error('❌ Could not connect to the backend API.');
    console.error(`   Make sure the server is running at ${API_URL}`);
    console.error(`   Error: ${error.message}`);
  }
}

seedAdmin();
