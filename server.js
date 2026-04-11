const express = require('express');
  const Anthropic = require('@anthropic-ai/sdk');                                
  const cors = require('cors');                             

  const app = express();
  app.use(express.json());
  app.use(cors({                                                                 
    origin: [
      'https://cognitops.com',                                                   
      'https://www.cognitops.com',                          
      'http://localhost:3000'
    ],                                                                           
    methods: ['POST', 'GET']
  }));                                                                           
                                                            
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });       
  const MEETINGS_LINK = process.env.MEETINGS_LINK ||
  'https://calendar.app.google/f5dgus17guTJSznU8';                               
                                                            
  const SYSTEM_PROMPT = `You are an AI assistant for CognitOps, a warehouse labor
   planning and optimization software company. Your job is to answer questions, 
  help visitors understand if CognitOps is a fit for their operation, and guide  
  interested prospects toward scheduling a demo.            

  ## About CognitOps                                                             
  
  **Products:**                                                                  
  - ALIGN: Real-time warehouse labor planning and optimization. Provides 
  real-time labor visibility by zone and function, predictive demand forecasting,
   dynamic rebalancing recommendations during the shift, and engineered labor 
  standards.                                                                     
  - BENCHMARK: Labor performance standards product. Helps warehouses establish, 
  track, and continuously improve engineered labor standards.                    
  
  **Core value proposition:** CognitOps works alongside your existing WMS — it   
  does NOT replace it. It adds the real-time labor intelligence, demand 
  forecasting, and performance visibility layer that WMS platforms were never    
  designed to provide.                                      

  **Implementation:** 6–8 weeks. No infrastructure changes required. Connects to 
  your WMS via standard APIs.
                                                                                 
  **WMS compatibility:** Works with all major WMS platforms — Blue Yonder,       
  Manhattan Associates, SAP EWM, Oracle WMS. Also supports home-grown and legacy 
  WMS including AS/400 systems via flexible connector options.                   
                                                            
  **Data ingestion speed:** 30 seconds to 5 minutes.                             
   
  **Proven results:**                                                            
  - Average $780,000 in annual savings per warehouse facility
  - Labor cost reductions of 10–34% depending on operation size and complexity   
  - Overtime cost reduction of 10–35% in the first year                          
  - Most customers achieve full ROI within the first quarter of deployment       
                                                                                 
  **Customer examples:**                                                         
  - McKesson — healthcare distribution, labor optimization                       
  - Sephora — CPG/beauty, reduced order cycle time 30%                           
  - PetSmart — retail distribution, labor optimization                           
  - Rural lifestyle retailer — reduced labor costs by $780K                      
                                                                                 
  **Industries served:** Retail, Healthcare Distribution, CPG, 3PL               
                                                                                 
  **Pricing:** Customized based on facility size, number of DCs, and complexity. 
  Best discussed in a demo.                                 
                                                                                 
  ## How to handle conversations                            

  - Answer questions accurately and concisely (2–4 sentences unless more detail  
  is needed)
  - Ask natural qualifying questions when relevant: How many FTEs in their DC?   
  What WMS do they use? What is their biggest labor challenge?                   
  - Be helpful and conversational, not salesy
  - When someone shows buying intent or asks about pricing or next steps, offer  
  the demo booking link                                                          
                                                                                 
  ## When to offer the demo                                                      
                                                            
  When someone is ready to learn more, say:                                      
  "The best next step is a 20-minute demo — the team will walk through your 
  specific operation and show you what the numbers would look like. You can book 
  directly here: ${MEETINGS_LINK}"
                                                                                 
  ## Lead capture                                           

  If someone seems engaged, naturally ask:                                       
  "What is your name and company? That way our team knows who to expect on the 
  call."`;                                                                       
                                                            
  const rateLimitMap = new Map();                                                
  function rateLimit(req, res, next) {                      
    const ip = req.ip;                                                           
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;                                             
    const maxRequests = 30;                                 
    if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);                         
    const requests = rateLimitMap.get(ip).filter(t => now - t < windowMs);
    if (requests.length >= maxRequests) {                                        
      return res.status(429).json({ error: 'Too many requests, please try again 
  later.' });                                                                    
    }                                                       
    requests.push(now);                                                          
    rateLimitMap.set(ip, requests);                         
    next();
  }

  app.post('/chat', rateLimit, async (req, res) => {                             
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {        
      return res.status(400).json({ error: 'Invalid messages format' });         
    }
    const recentMessages = messages.slice(-20).map(m => ({                       
      role: m.role,                                                              
      content: String(m.content).slice(0, 2000)
    }));                                                                         
    try {                                                   
      const response = await client.messages.create({                            
        model: 'claude-haiku-4-5-20251001',                 
        max_tokens: 400,                                                         
        system: SYSTEM_PROMPT,
        messages: recentMessages                                                 
      });                                                   
      res.json({ content: response.content[0].text });                           
    } catch (error) {
      console.error('Claude API error:', error.message);                         
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  });                                                                            
                                                            
  app.get('/health', (req, res) => res.json({ status: 'ok' }));                  
  
  const PORT = process.env.PORT || 3000;                                         
  app.listen(PORT, () => console.log(`CognitOps chat running on port ${PORT}`));
