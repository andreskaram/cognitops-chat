  const express = require('express');                                                                                 
  const Anthropic = require('@anthropic-ai/sdk');                                                                       
  const cors = require('cors');                                                                                         
  const path = require('path');
  const fs = require('fs');                                                                                             
                                                                                                                      
  const app = express();
  app.use(express.static(path.join(__dirname)));
  app.use(express.json());                                                                                              
  app.use(cors({
    origin: ['https://cognitops.com', 'https://www.cognitops.com'],                                                     
    methods: ['POST', 'GET']                                                                                          
  }));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });                                              
  const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf8');
  const SHEETS_WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL;                                                            
                                                                                                                        
  const rateLimitMap = new Map();
  function rateLimit(req, res, next) {                                                                                  
    const ip = req.ip;                                                                                                
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;                                                                                    
    const maxRequests = 30;
    if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, []);                                                                
    const requests = rateLimitMap.get(ip).filter(function(t) { return now - t < windowMs; });                           
    if (requests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests.' });                                                     
    }                                                                                                                   
    requests.push(now);
    rateLimitMap.set(ip, requests);                                                                                     
    next();                                                                                                           
  }

  function logToSheet(sessionId, userMessage, botResponse, ip) {                                                        
    if (!SHEETS_WEBHOOK_URL) return;
    fetch(SHEETS_WEBHOOK_URL, {                                                                                         
      method: 'POST',                                                                                                 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),                                                                            
        sessionId: sessionId,
        userMessage: userMessage,                                                                                       
        botResponse: botResponse,                                                                                     
        ip: ip
      })
    }).catch(function(err) { console.error('Sheet log error:', err.message); });
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
      const botResponse = response.content[0].text;
      const userMessage = messages[messages.length - 1].content;
      const ip = req.ip;                                                                                                
      const sessionId = ip + '-' + new Date().toISOString().slice(0, 10);
      logToSheet(sessionId, userMessage, botResponse, ip);                                                              
      res.json({ content: botResponse });                                                                               
    } catch (error) {
      console.error('Error:', error.message);                                                                           
      res.status(500).json({ error: 'Something went wrong.' });                                                       
    }                                                                                                                   
  });
