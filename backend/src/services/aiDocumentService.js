const axios = require("axios");

async function isDocumentFake(filePath) {
  // فرض: ارسال تصویر به یک API هوش مصنوعی
  // در حالت واقعی، اینجا می‌توانید مدل داخلی یا سرویس ابری قرار دهید
  const response = await axios.post("https://ai.example.com/verify-document", {
    filePath,
  });
  return response.data.isFake; // true/false
}

module.exports = { isDocumentFake };
