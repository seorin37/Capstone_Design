const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    // 1. 파일 이름 (예: 'earthmap1k.jpg')
    filename: { type: String, required: true, unique: true }, 
    
    // ★ [여기가 변경된 부분] ★
    // 이미지 데이터(Buffer) 대신, 파일이 위치한 경로(String)를 저장합니다.
    // 예: '/textures/earthmap1k.jpg'
    path: { type: String, required: true },                   
    
    // 3. 파일 타입 (texture, model 등 구분용)
    type: { type: String, default: 'texture' },               
    
    // 4. 언제 등록했는지
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Asset', AssetSchema);