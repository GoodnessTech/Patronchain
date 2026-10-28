import { build } from 'vite';

console.log('Starting programmatic Vite build...');
try {
  const result = await build();
  console.log('🎉 Vite build completed successfully!');
} catch (err) {
  console.error('❌ Vite build error:', err);
  process.exit(1);
}
