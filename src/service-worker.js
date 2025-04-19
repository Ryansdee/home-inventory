self.addEventListener('install', event => {
    console.log('Service worker installed');
  });
  
  self.addEventListener('fetch', event => {
    // You can customize cache behavior here
  });
  