import mongoose from 'mongoose';
import { Share } from '../models/Share'; // 你的 schema 檔案

async function testSchema() {
  await mongoose.connect('mongodb://localhost:27017/testdb'); // 替換成你的 URI

  try {
    const newShare = new Share({
      shareId: 'test-001',
      items: [
        {
          id: 'item-123',
          type: 'photo',
          position: { x: 100, y: 200 },
          zIndex: 1,
          rotation: 0,
          data: {
            imageUrl: 'uploads/photo.jpg',
            dateTaken: '2025-03-28',
            content: '測試內容',
            audioUrl: '',
            spotifyUrl: '',
            svgData: '',
            aiImages: [
              {
                url: 'uploads/ai-v1.jpg',
                style: '漫畫風'
              }
            ]
          }
        }
      ],
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // +1 天
    });

    await newShare.save(); // ✅ 這裡如果成功就代表 schema 沒錯
    console.log('✅ 測試儲存成功！');
} catch (err) {
    if (err instanceof Error) {
      console.error('❌ schema 錯誤或驗證失敗：', err.message);
    } else {
      console.error('❌ 發生未知錯誤：', err);
    }
  }

  await mongoose.disconnect();
}

testSchema();

// run below in the root terminal to test
// npx ts-node server/src/routes/testSchema.ts