# 🚀 BULK-GPT Modal Processor

Production-grade batch processor for CSV data through Google Gemini API, deployed on Modal.com with 24-hour timeout support.

## 📦 Files

```
modal-processor/
├── main.py                 # Core processor with 24-hour timeout
├── DEPLOYMENT.md           # Complete deployment guide
├── .env.example            # Environment variables template
└── README.md              # This file
```

## ⚡ Quick Start

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Add your credentials to .env.local
vi .env.local

# 3. Deploy to Modal (SCAILE workspace)
modal deploy main.py --env-file .env.local

# 4. Monitor
modal logs bulk-gpt-processor-mvp --follow
```

## 🎯 What It Does

Processes CSV rows through Gemini API with:
- ✅ 24-hour timeout (no queue needed!)
- ✅ 10,000+ rows per batch
- ✅ Template variable replacement ({{column}})
- ✅ Automatic error handling
- ✅ Real-time progress logging
- ✅ Supabase integration
- ✅ Built-in retry logic

## 🔧 Configuration

**Environment Variables** (set in `.env.local`):

```bash
GEMINI_API_KEY=your-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 Performance

```
10,000 rows:   ~50 minutes   $0.42
100,000 rows:  ~8 hours      $4.15
1M rows/month: ~83 hours     $41.65
```

## 🔗 Integration

Call from Next.js API:

```typescript
// app/api/process-batch-modal/route.ts
const modalResponse = await fetch('https://bulk-gpt-processor-mvp--process-batch.modal.run', {
  method: 'POST',
  body: JSON.stringify({
    batch_id: 'batch-123',
    rows: [...],
    prompt: 'Process {{name}}',
  }),
})
```

## 📚 Full Documentation

See `DEPLOYMENT.md` for:
- Detailed setup instructions
- Deployment verification
- Monitoring & debugging
- Cost estimation
- Troubleshooting

## ✅ Status

- **Profile**: SCAILE ✓
- **CLI**: Modal 1.1.1 ✓
- **Ready to deploy**: YES ✓

## 🚀 Deploy Now

```bash
modal deploy main.py --env-file .env.local
```

