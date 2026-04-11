const express = require('express');                                            
  const Anthropic = require('@anthropic-ai/sdk');                                
  const cors = require('cors');                                                  
  const path = require('path');                                                  
                                                            
  const app = express();
  app.use(express.static(path.join(__dirname)));
  app.use(express.json());                                                       
  app.use(cors({
    origin: ['https://cognitops.com', 'https://www.cognitops.com'],              
    methods: ['POST', 'GET']                                                     
  }));
                                                                                 
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });       
  const MEETINGS_LINK = process.env.MEETINGS_LINK ||
  'https://calendar.app.google/f5dgus17guTJSznU8';                               
                                                            
  const SYSTEM_PROMPT = 'You are an AI assistant for CognitOps, a warehouse labor
   planning and optimization software company. Answer questions about CognitOps, 
  help visitors understand if it is a good fit, and guide prospects toward       
  scheduling a demo.\n\nABOUT COGNITOPS:\n- ALIGN product: real-time labor 
  planning, demand forecasting, dynamic rebalancing, engineered labor
  standards\n- BENCHMARK product: labor performance standards tracking\n- Works
  alongside existing WMS, does not replace it\n- Implementation: 6-8 weeks, no
  infrastructure changes\n- Compatible with Blue Yonder, Manhattan, SAP EWM,
  Oracle, AS400 and legacy systems\n- Data ingestion: 30 seconds to 5 minutes\n-
  Average $780K annual savings per facility, 10-34% labor cost reduction\n-
  Customers: McKesson, Sephora (30% order cycle time reduction), PetSmart\n-
  Industries: Retail, Healthcare Distribution, CPG, 3PL\n- Pricing: customized,
  best discussed in demo\n\nHOW TO HANDLE CONVERSATIONS:\n- Keep responses to 2-4
   sentences\n- Ask qualifying questions naturally: FTE count, current WMS,
  biggest labor challenge\n- Be helpful not salesy\n- When someone wants pricing
  or next steps, offer the demo link\n- Capture name and company when someone is
  engaged\n\nDEMO BOOKING:\nWhen someone is ready say: The best next step is a
  20-minute demo where the team walks through your specific numbers. Book
  directly here: ' + MEETINGS_LINK;

  const rateLimitMap = new Map();
  function rateLimit(req, res, next) {
    const ip = req.ip;                                                           
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;                                             
    const maxRequests = 30;                                                      
    if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);
    const requests = rateLimitMap.get(ip).filter(function(t) { return now - t <  
  windowMs; });                                             
    if (requests.length >= maxRequests) {                                        
      return res.status(429).json({ error: 'Too many requests.' });              
    }
    requests.push(now);                                                          
    rateLimitMap.set(ip, requests);                         
    next();
  }                                                                              
   
  app.post('/chat', rateLimit, async function(req, res) {                        
    const messages = req.body.messages;                     
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages.' });               
    }                                                                            
    const recentMessages = messages.slice(-20).map(function(m) {                 
      return { role: m.role, content: String(m.content).slice(0, 2000) };        
    });                                                                          
    try {
      const response = await client.messages.create({                            
        model: 'claude-haiku-4-5-20251001',                 
        max_tokens: 400,                                                         
        system: SYSTEM_PROMPT,
        messages: recentMessages                                                 
      });                                                   
      res.json({ content: response.content[0].text });                           
    } catch (error) {                                       
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Something went wrong.' });                  
    }
  });                                                                            
                                                            
  app.get('/health', function(req, res) { res.json({ status: 'ok' }); });        
   
  const PORT = process.env.PORT || 3000;                                         
  app.listen(PORT, function() { console.log('Server running on port ' + PORT);
  });  
