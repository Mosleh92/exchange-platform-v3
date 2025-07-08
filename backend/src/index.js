const app = require('./app');
const mongoose = require('mongoose');
const config = require('./config');

mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('اتصال به پایگاه داده برقرار شد');
    app.listen(config.port, () => {
      console.log(`سرور در پورت ${config.port} در حال اجراست`);
    });
  })
  .catch(err => {
    console.error('خطا در اتصال به پایگاه داده:', err);
    process.exit(1);
  });