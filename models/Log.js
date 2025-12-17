const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    userPrompt: { type: String, required: true }, // 사용자가 입력한 텍스트
    aiResponse: { type: Object, required: true }, // AI가 준 JSON 데이터
    timestamp: { type: Date, default: Date.now }  // 언제 저장했는지 시간
});

module.exports = mongoose.model('Log', LogSchema);