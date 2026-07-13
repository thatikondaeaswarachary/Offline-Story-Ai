import React, { useState, useEffect, useRef } from 'react';
import { CreateMLCEngine, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { Sparkles, BookOpen, Settings, Play, ChevronRight, Save, Download, Ghost, Rocket, Scroll, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Removed static SELECTED_MODEL to allow dynamic selection

function App() {
  // UI State
  const [engine, setEngine] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('Not loaded');
  const [downloadError, setDownloadError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Settings State
  const [genre, setGenre] = useState('Fantasy');
  const [tone, setTone] = useState('Epic');
  const [length, setLength] = useState('500 words');
  const [heroDesc, setHeroDesc] = useState('A young mage looking for adventure.');
  const [questDesc, setQuestDesc] = useState('Recover the lost artifact of eternity.');
  const [language, setLanguage] = useState('English');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('default');
  
  // Story State
  const [story, setStory] = useState('');
  const [choices, setChoices] = useState([]);
  const [messages, setMessages] = useState([]);

  // Model Selection
  const [selectedModel, setSelectedModel] = useState('SmolLM2-135M-Instruct-q0f16-MLC');

  // End of generation auto-scroll ref
  const storyEndRef = useRef(null);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Update available voices when language changes
  useEffect(() => {
    const loadVoices = () => {
      let currentLang = 'en';
      if (language === 'Telugu') currentLang = 'te';
      else if (language === 'Hindi') currentLang = 'hi';
      else if (language === 'Spanish') currentLang = 'es';
      else if (language === 'French') currentLang = 'fr';
      
      const voices = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(currentLang));
      setAvailableVoices(voices);
      
      if (voices.length > 0) {
        setSelectedVoiceURI(voices[0].voiceURI);
      } else {
        setSelectedVoiceURI('google_tts');
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [language]);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!story) return;

    // Strip markdown formatting
    const textToRead = story.replace(/[#*>_]/g, '');
    
    // Split into sentences to avoid 15-second browser cutoff limit
    const sentences = textToRead.match(/[^.!?]+[.!?]+/g) || [textToRead];
    
    let currentLang = 'en-US';
    let shortLang = 'en';
    if (language === 'Telugu') { currentLang = 'te-IN'; shortLang = 'te'; }
    else if (language === 'Hindi') { currentLang = 'hi-IN'; shortLang = 'hi'; }
    else if (language === 'Spanish') { currentLang = 'es-ES'; shortLang = 'es'; }
    else if (language === 'French') { currentLang = 'fr-FR'; shortLang = 'fr'; }

    const startSpeaking = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      
      let currentIndex = 0;

      const speakNext = () => {
        if (currentIndex >= sentences.length) {
          setIsSpeaking(false);
          return;
        }
        const textChunk = sentences[currentIndex].trim();
        
        // If Google TTS is selected (or no local voice is found)
        if (selectedVoiceURI === 'google_tts' || !preferredVoice) {
          const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textChunk)}&tl=${shortLang}&client=tw-ob`;
          const audio = new Audio(url);
          audio.onended = () => {
            currentIndex++;
            speakNext();
          };
          audio.onerror = (e) => {
            console.error("Google TTS Error:", e);
            setIsSpeaking(false);
            alert("Google TTS failed. Make sure you are connected to the internet to hear this voice.");
          };
          audio.play();
        } else {
          // Standard offline browser TTS
          const utterance = new SpeechSynthesisUtterance(textChunk);
          utterance.lang = currentLang;
          if (preferredVoice) utterance.voice = preferredVoice;
          
          utterance.onend = () => {
            currentIndex++;
            speakNext();
          };
          
          utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setIsSpeaking(false);
          };
          window.speechSynthesis.speak(utterance);
        }
      };

      setIsSpeaking(true);
      speakNext();
    };

    // Browsers often load voices asynchronously
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        startSpeaking();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      startSpeaking();
    }
  };

  const initModel = async () => {
    if (engine) return;
    setModelLoading(true);
    setDownloadError('');
    try {
      const initProgressCallback = (report) => {
        setProgressText(report.text);
        if (report.progress) {
          setProgress(report.progress * 100);
        }
      };

      const baseSmol = prebuiltAppConfig.model_list.find(m => m.model_id === 'SmolLM2-135M-Instruct-q0f16-MLC');
      const customAppConfig = {
        model_list: [
          ...prebuiltAppConfig.model_list.filter(m => m.model_id !== 'SmolLM2-135M-Instruct-q0f16-MLC'),
          {
            ...baseSmol,
            model: window.location.origin + "/models/SmolLM2-135M-Instruct-q0f16-MLC/"
          }
        ]
      };

      const newEngine = await CreateMLCEngine(
        selectedModel,
        { 
          initProgressCallback,
          appConfig: customAppConfig
        }
      );
      
      setEngine(newEngine);
      setProgressText('Model Ready');
      setProgress(100);
    } catch (err) {
      console.error(err);
      if (err.message && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to execute'))) {
        setDownloadError("Network Connection Dropped. Your VPN, Firewall, or Adblocker blocked the AI download from HuggingFace. Please disable them, select a smaller model, and try again.");
      } else {
        setDownloadError('Failed to load model: ' + err.message);
      }
      setProgressText('Download failed');
    } finally {
      setModelLoading(false);
    }
  };

  const generateStory = async (isContinuation = false, userChoice = '') => {
    if (!engine) {
      alert("Please load the offline model first!");
      return;
    }
    
    setIsGenerating(true);
    setChoices([]);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    let currentMessages = [];
    
    // Create a very strict language enforcement string
    const langEnforcement = language === 'English' ? '' : `CRITICAL INSTRUCTION: You MUST generate the ENTIRE output in ${language}. Do not use English! Use the native script for ${language}.`;
    
    if (!isContinuation) {
      const systemPrompt = `You are an offline AI storyteller. You generate highly immersive, creative, and engaging interactive stories. ${langEnforcement}`;
      const userPrompt = `Generate the beginning of a short story/RPG quest based on these inputs:
Genre: ${genre}
Tone: ${tone}
Language: ${language}
Length Target: ${length}
Hero: ${heroDesc}
Quest: ${questDesc}

${langEnforcement}
Output a highly detailed, descriptive scene. End the scene by presenting 2-3 distinct, numbered choices for the hero to make next. Format the choices clearly at the very end of your response.`;
      
      currentMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      setStory('');
    } else {
      currentMessages = [...messages, { role: 'user', content: `I choose: ${userChoice}. Continue the story from here in ${language} and then present 2-3 new numbered choices for what to do next. ${langEnforcement}` }];
      setStory(prev => prev + `\n\n> **You chose: ${userChoice}**\n\n`);
    }

    try {
      const chunks = await engine.chat.completions.create({
        messages: currentMessages,
        temperature: 0.7,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of chunks) {
        const text = chunk.choices[0]?.delta?.content || '';
        fullResponse += text;
        
        if (!isContinuation) {
          setStory(fullResponse);
        } else {
          setStory(prev => prev + text);
        }
        
        // Auto scroll
        if (storyEndRef.current) {
          storyEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }

      setMessages([...currentMessages, { role: 'assistant', content: fullResponse }]);
      
      // Basic heuristic to parse choices at the end
      parseChoices(fullResponse);

    } catch (error) {
      console.error(error);
      setStory(prev => prev + "\n\n**Error generating story. See console.**");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseChoices = (text) => {
    // Look for lines starting with "1.", "2.", "3.", etc. towards the end of the text
    const lines = text.split('\n');
    const extractedChoices = [];
    
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        extractedChoices.push(match[2].replace(/\*/g, '').trim());
      }
    }
    
    // If we found valid choices at the end, use them. Otherwise leave empty.
    if (extractedChoices.length > 0) {
      setChoices(extractedChoices);
    }
  };

  const getGenreIcon = () => {
    switch(genre) {
      case 'Fantasy': return <Scroll size={18} />;
      case 'Sci-Fi': return <Rocket size={18} />;
      case 'Mystery': return <Ghost size={18} />;
      default: return <BookOpen size={18} />;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container text-gradient">
          <Sparkles size={32} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '2rem' }}>Mythweaver</h1>
        </div>
        
        <div className="model-status">
          <div className={`status-pill ${engine ? 'ready' : modelLoading ? 'loading' : ''}`}>
            {engine ? '🟢 Offline AI Ready' : modelLoading ? '🟡 Downloading Model...' : '⚪ Model Not Loaded'}
          </div>
          {modelLoading && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {progressText}
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          {downloadError && (
            <div style={{ marginTop: 12, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', maxWidth: '400px' }}>
              <strong>⚠️ Download Failed</strong>
              <p style={{ marginTop: 4 }}>{downloadError}</p>
            </div>
          )}
          {!engine && !modelLoading && (
            <button className="btn btn-secondary" style={{ marginLeft: 12, padding: '6px 12px', fontSize: '0.9rem' }} onClick={initModel}>
              <Download size={16} /> Load Local AI
            </button>
          )}
        </div>
      </header>

      <main className="main-layout">
        {/* Sidebar Settings */}
        <aside className="settings-panel glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Settings size={20} className="text-gradient" />
            <h2 style={{ fontSize: '1.25rem' }}>Story Parameters</h2>
          </div>

          <div className="setting-group">
            <label>AI Model Size</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={modelLoading || engine !== null}>
              <option value="SmolLM2-135M-Instruct-q0f16-MLC">SmolLM2 135M (Ultra Fast - ENGLISH ONLY)</option>
              <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama-3.2 1B (~800MB - required for Telugu/Hindi)</option>
              <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3 Mini (~2.2GB - Best Quality)</option>
              <option value="TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC">TinyLlama 1.1B (~650MB)</option>
            </select>
            {selectedModel === 'SmolLM2-135M-Instruct-q0f16-MLC' && (language === 'Telugu' || language === 'Hindi') && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 4 }}>
                ⚠️ The 135M model is too small to speak {language} natively. It will output English. Please select Llama-3.2 1B from the dropdown for {language} support!
              </p>
            )}
          </div>

          <div className="setting-group">
            <label>Language</label>
            <div className="language-options">
              {['English', 'Telugu', 'Hindi', 'Spanish'].map(lang => (
                <label key={lang} className={`lang-pill ${language === lang ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="language"
                    value={lang}
                    checked={language === lang}
                    onChange={e => setLanguage(e.target.value)}
                    disabled={isGenerating}
                    style={{ display: 'none' }}
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label>Voice Narrator</label>
            <select value={selectedVoiceURI} onChange={e => setSelectedVoiceURI(e.target.value)} disabled={isGenerating || isSpeaking}>
              {availableVoices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} (Offline Local)
                </option>
              ))}
              <option value="google_tts">Google Cloud Voice (Online Backup)</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Genre</label>
            <select value={genre} onChange={e => setGenre(e.target.value)} disabled={isGenerating}>
              <option value="Fantasy">Fantasy</option>
              <option value="Sci-Fi">Sci-Fi / Cyberpunk</option>
              <option value="Mystery">Mystery / Detective</option>
              <option value="Horror">Horror</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} disabled={isGenerating}>
              <option value="Epic">Epic</option>
              <option value="Dark">Dark & Gritty</option>
              <option value="Funny">Funny & Lighthearted</option>
              <option value="Melancholic">Melancholic</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Length</label>
            <select value={length} onChange={e => setLength(e.target.value)} disabled={isGenerating}>
              <option value="ONLY 3 SENTENCES TOTAL (EXTREMELY FAST)">Ultra Fast (3 Sentences - ~5 Seconds)</option>
              <option value="500 words">Short (~500 words)</option>
              <option value="1000 words">Medium (~1000 words)</option>
              <option value="2000 words">Long (~2000 words)</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Hero Description</label>
            <input 
              type="text" 
              value={heroDesc} 
              onChange={e => setHeroDesc(e.target.value)}
              placeholder="e.g. A rogue space pilot"
              disabled={isGenerating}
            />
          </div>

          <div className="setting-group">
            <label>Quest / Goal</label>
            <textarea 
              value={questDesc} 
              onChange={e => setQuestDesc(e.target.value)}
              rows={3}
              placeholder="e.g. Infiltrate the megacorp and steal the data."
              disabled={isGenerating}
            />
          </div>

          <button 
            className={`btn btn-primary ${isGenerating ? 'generating' : ''}`}
            onClick={() => generateStory(false)}
            disabled={isGenerating || !engine}
            style={{ marginTop: 'auto' }}
          >
            {isGenerating ? 'Weaving Story...' : 'Start Adventure'}
            {!isGenerating && <Play size={18} />}
          </button>
        </aside>

        {/* Main Story Area */}
        <section className="story-area">
          <div className="glass-panel story-content animate-slide-up">
            {!story ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)' }}>
                {getGenreIcon()}
                <h3 style={{ marginTop: 16 }}>Your adventure awaits</h3>
                <p>Configure the settings and click "Start Adventure" to generate an offline, completely private story.</p>
              </div>
            ) : (
              <div className="markdown-body">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', gap: 8 }} onClick={toggleSpeech}>
                    {isSpeaking ? <><VolumeX size={18} /> Stop AI Voice</> : <><Volume2 size={18} /> Tell Story (AI Voice)</>}
                  </button>
                </div>
                <ReactMarkdown>{story}</ReactMarkdown>
                <div ref={storyEndRef} />
              </div>
            )}
            
            {/* Interactive Choices */}
            {choices.length > 0 && !isGenerating && (
              <div className="choices-area">
                {choices.map((choice, idx) => (
                  <button 
                    key={idx} 
                    className="btn btn-secondary animate-slide-up"
                    style={{ animationDelay: `${idx * 0.1}s`, textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
                    onClick={() => generateStory(true, choice)}
                  >
                    <span>{choice}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            )}

            {isGenerating && story && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <span className="status-pill loading">AI is typing...</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
