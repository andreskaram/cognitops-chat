const express = require('express');                       
  const Anthropic = require('@anthropic-ai/sdk');                                
  const cors = require('cors');
                                                                                 
  const app = express();                                    
  app.use(express.json());
  app.use(cors({                                                                 
    origin: ['https://cognitops.com', 'https://www.cognitops.com'],
    methods: ['POST', 'GET']                                                     
  }));                                                                           
   
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });       
  const MEETINGS_LINK = process.env.MEETINGS_LINK ||        
  'https://calendar.app.google/f5dgus17guTJSznU8';                               
   
  const SYSTEM_PROMPT = `You are an AI assistant for CognitOps, a warehouse labor
   planning and optimization software company. Answer questions about CognitOps, 
  help visitors understand if it is a good fit, and guide prospects toward       
  scheduling a demo.                                        

  ABOUT COGNITOPS:
  - ALIGN product: real-time labor planning, demand forecasting, dynamic 
  rebalancing, engineered labor standards                                        
  - BENCHMARK product: labor performance standards tracking
  - Works alongside existing WMS, does not replace it                            
  - Implementation: 6-8 weeks, no infrastructure changes                         
  - Compatible with Blue Yonder, Manhattan, SAP EWM, Oracle, AS/400 and legacy   
  systems                                                                        
  - Data ingestion: 30 seconds to 5 minutes                                      
  - Average $780K annual savings per facility, 10-34% labor cost reduction       
  - Customers: McKesson, Sephora (30% order cycle time reduction), PetSmart      
  - Industries: Retail, Healthcare Distribution, CPG, 3PL                        
  - Pricing: customized, best discussed in demo                                  
                                                                                 
  HOW TO HANDLE CONVERSATIONS:                                                   
  - Keep responses to 2-4 sentences                                              
  - Ask qualifying questions naturally: FTE count, current WMS, biggest labor    
  challenge                                                                      
  - Be helpful not salesy                                                        
  - When someone wants pricing or next steps, offer the demo link                
  - Capture name and company when someone is engaged                             
                                                                                 
  DEMO BOOKING:                                                                  
  When someone is ready: "The best next step is a 20-minute demo where the team  
  walks through your specific numbers. Book directly here: ${MEETINGS_LINK}"`;   
   
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
   app.get('/widget.js', function(req, res) {                
    res.setHeader('Content-Type', 'application/javascript');                     
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(`                                                                   
  var CO_BACKEND = 'https://cognitops-chat.onrender.com';                        
  var coMessages = [];
  var coIsOpen = false;                                                          
  var coIsLoading = false;                                  
  var coWelcome = 'Hi! I can answer questions about CognitOps warehouse          
  optimization software, or help figure out if it is a good fit for your         
  operation. What would you like to know?';
                                                                                 
  function coAppendMessage(role, text) {                                         
    var el = document.getElementById('co-chat-messages');
    var div = document.createElement('div');                                     
    div.className = 'co-msg ' + role;                       
    div.innerHTML = text                                                         
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/(https?:\\/\\/[^\\s]+)/g,'<a href="$1" target="_blank"           
  rel="noopener">Book here</a>')                                                 
      .replace(/\\n/g,'<br>');                                                   
    el.appendChild(div);                                                         
    el.scrollTop = el.scrollHeight;                         
  }                                                                              
                                                            
  function coToggle() {
    coIsOpen = !coIsOpen;
    document.getElementById('co-chat-window').classList.toggle('open', coIsOpen);
    if (coIsOpen && coMessages.length === 0) {
      coAppendMessage('bot', coWelcome);                                         
      coMessages.push({ role: 'assistant', content: coWelcome });
    }                                                                            
    if (coIsOpen) setTimeout(function(){                    
  document.getElementById('co-chat-input').focus(); }, 100);                     
  }                                                         
                                                                                 
  function coSend() {                                       
    if (coIsLoading) return;
    var input = document.getElementById('co-chat-input');                        
    var text = input.value.trim();
    if (!text) return;                                                           
    input.value = '';                                       
    input.style.height = 'auto';
    coAppendMessage('user', text);                                               
    coMessages.push({ role: 'user', content: text });
    coIsLoading = true;                                                          
    document.getElementById('co-chat-send').disabled = true;
    var el = document.getElementById('co-chat-messages');                        
    var typing = document.createElement('div');                                  
    typing.className = 'co-typing';
    typing.id = 'co-typing';                                                     
    typing.innerHTML = '<span></span><span></span><span></span>';
    el.appendChild(typing);                                                      
    el.scrollTop = el.scrollHeight;
    fetch(CO_BACKEND + '/chat', {                                                
      method: 'POST',                                                            
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: coMessages })                             
    })                                                      
    .then(function(r){ return r.json(); })
    .then(function(data) {                                                       
      var t = document.getElementById('co-typing');
      if (t) t.remove();                                                         
      var reply = data.content || 'Something went wrong, please try again.';
      coAppendMessage('bot', reply);                                             
      coMessages.push({ role: 'assistant', content: reply });
      coIsLoading = false;                                                       
      document.getElementById('co-chat-send').disabled = false;                  
    })
    .catch(function() {                                                          
      var t = document.getElementById('co-typing');         
      if (t) t.remove();
      coAppendMessage('bot', 'Connection issue. You can book directly at         
  cognitops.com/demo/');                                                         
      coIsLoading = false;                                                       
      document.getElementById('co-chat-send').disabled = false;                  
    });                                                     
  }                                                                              
                                                            
  function coInit() {
    var btn = document.getElementById('co-chat-btn');
    var close = document.getElementById('co-chat-close');                        
    var send = document.getElementById('co-chat-send');
    var input = document.getElementById('co-chat-input');                        
    if (!btn) return;                                                            
    btn.addEventListener('click', coToggle);
    close.addEventListener('click', coToggle);                                   
    send.addEventListener('click', coSend);                                      
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); coSend(); }    
    });                                                                          
    input.addEventListener('input', function() {
      this.style.height = 'auto';                                                
      this.style.height = this.scrollHeight + 'px';         
    });                                                                          
  }
                                                                                 
  if (document.readyState === 'loading') {                  
    document.addEventListener('DOMContentLoaded', coInit);
  } else {
    coInit();
  }                                                                              
    `);
  });                                                                                        
  app.get('/health', function(req, res) { res.json({ status: 'ok' }); });

  const PORT = process.env.PORT || 3000;                                         
  app.listen(PORT, function() { console.log('Server running on port ' + PORT);
  });            
