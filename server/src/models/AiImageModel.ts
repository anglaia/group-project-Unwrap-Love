import mongoose from 'mongoose'

const AiImageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  imageUrl: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  zIndex: { type: Number, required: true },
  rotation: { type: Number, required: true },
  dateTaken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const AiImageModel = mongoose.model('AiImage', AiImageSchema)

export default AiImageModel
