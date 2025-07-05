// AI Writer for Ski Resort Atlas
(function() {
    // DOM elements
    const aiOutputElements = document.querySelectorAll('#ai-output');
    const generateBtn = document.getElementById('generate-description');
    const aiStatus = document.getElementById('ai-status');
    
    // === NEW: Add style buttons ===
    const styleOptions = [
        { key: 'default', label: 'Ski Atlas Entry about the Resort', prompt: '' },
        { key: 'ski_bum', label: 'A ski bum looking to shred powder', prompt: 'Write as a ski bum who is stoked to shred powder.' },
        { key: 'ski_dad', label: 'A ski dad looking to take his kid out to learn to ski', prompt: 'Write as a ski dad taking his kid out to learn to ski.' },
        { key: 'hater', label: 'Someone who hates the resort in question', prompt: 'Write as someone who hates this resort.' },
        { key: 'custom', label: 'Custom Style', prompt: '' }
    ];
    let selectedStyle = styleOptions[0].key;
    let customPrompt = '';

    // API Gateway endpoint
    const apiEndpoint = 'https://q7pd65o687.execute-api.us-east-1.amazonaws.com/deploy/generate-description';
    
    // Add this at the top of aiWriter.js to make it wait for resort data
    let statsCheckInterval;
    let resortDataReady = false;

    function checkForResortData() {
        if (window.resortData) {
            console.log("Resort data is now available for AI writer");
            resortDataReady = true;
            clearInterval(statsCheckInterval);
        } else {
            console.log("Checking for resort data... not found yet");
        }
    }

    // Start checking for resort data when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        statsCheckInterval = setInterval(checkForResortData, 1000);
        // Clear interval after 10 seconds to prevent infinite checking
        setTimeout(() => {
            if (statsCheckInterval) {
                console.log("Resort data watcher timed out");
                clearInterval(statsCheckInterval);
            }
        }, 10000);
    });
    
    // Initialize the module
    function init() {
        console.log('AI Writer initialized. API endpoint:', apiEndpoint);
        
        // Hide the generate button since we're making it automatic
        if (generateBtn) {
            generateBtn.style.display = 'none';
        }
        
        // Add style buttons
        addStyleButtons();
        
        // Set placeholder text
        setPlaceholderText();
        
        // Check for duplicate IDs and warn
        if (aiOutputElements.length > 1) {
            console.warn('Multiple elements with id="ai-output" found. Will update all of them.', aiOutputElements);
        }
        
        // Make the generateDescription function available globally
        window.generateAIDescription = (resortData) => generateDescription(resortData, selectedStyle);
        
        // Also set up a watcher as backup
        watchResortStats();
    }
    
    // Set placeholder text in all AI output elements
    function setPlaceholderText() {
        aiOutputElements.forEach(element => {
            element.innerHTML = '<p class="placeholder-text">Select a resort on the map to see an AI-powered description.</p>';
        });
    }
    
    // Watch for changes to resortStats object
    function watchResortStats() {
        console.log('Starting resort stats watcher');
        
        // First check immediately if stats already exist
        if (window.resortStats && window.resortStats.name) {
            console.log('Resort stats already available:', window.resortStats.name);
            generateDescription(window.resortStats, selectedStyle);
            return;
        }
        
        // Use interval to check for resortStats
        let statsCheckInterval = setInterval(() => {
            console.log('Checking for resort stats...', window.resortStats?.name || 'not found');
            if (window.resortStats && window.resortStats.name) {
                console.log('Resort stats found:', window.resortStats.name);
                clearInterval(statsCheckInterval);
                generateDescription(window.resortStats, selectedStyle);
            }
        }, 1000);
        
        // Set a timeout to clear the interval
        setTimeout(() => {
            clearInterval(statsCheckInterval);
            console.log('Resort stats watcher timed out');
        }, 30000); // Stop checking after 30 seconds
    }
    
    // Add style buttons to the DOM
    function addStyleButtons() {
        const aiControls = document.querySelector('.ai-controls');
        if (!aiControls) return;

        // Create container for style buttons
        let styleContainer = document.createElement('div');
        styleContainer.className = 'ai-style-buttons';
        styleContainer.style.marginBottom = '10px';

        styleOptions.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option.label;
            btn.className = 'button small ai-style-btn';
            btn.dataset.styleKey = option.key;
            if (option.key === selectedStyle) btn.classList.add('selected');
            btn.style.margin = '0 8px 8px 0';
            btn.addEventListener('click', () => {
                // Update selected style
                selectedStyle = option.key;
                // Update button styles
                document.querySelectorAll('.ai-style-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Show or hide custom prompt input
                updateCustomPromptField();
                
                // Regenerate description for current resort if available
                if (window.resortStats && window.resortStats.name) {
                    generateDescription(window.resortStats, selectedStyle);
                }
            });
            styleContainer.appendChild(btn);
        });

        // Add custom prompt input field
        const customPromptContainer = document.createElement('div');
        customPromptContainer.id = 'custom-prompt-container';
        customPromptContainer.style.display = 'none';
        customPromptContainer.style.marginTop = '10px';
        
        const inputWrapper = document.createElement('div');
        inputWrapper.style.display = 'flex';
        inputWrapper.style.gap = '10px';
        inputWrapper.style.marginBottom = '10px';
        
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.id = 'custom-prompt-input';
        customInput.maxLength = 150;
        customInput.placeholder = 'Enter your custom style (max 150 characters)';
        customInput.style.flex = '1';
        customInput.addEventListener('input', (e) => {
            customPrompt = e.target.value;
            // Enable/disable send button based on input
            sendButton.disabled = !customPrompt.trim();
        });
        
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.className = 'button small';
        sendButton.disabled = true; // Disabled by default until there's input
        sendButton.addEventListener('click', () => {
            if (customPrompt && window.resortStats && window.resortStats.name) {
                generateDescription(window.resortStats, selectedStyle);
            }
        });
        
        inputWrapper.appendChild(customInput);
        inputWrapper.appendChild(sendButton);
        customPromptContainer.appendChild(inputWrapper);
        styleContainer.appendChild(customPromptContainer);

        // Insert style buttons before the generate button
        aiControls.insertBefore(styleContainer, aiControls.firstChild);
        
        // Initialize custom prompt field visibility
        updateCustomPromptField();
    }
    
    // Show/hide custom prompt field based on selected style
    function updateCustomPromptField() {
        const container = document.getElementById('custom-prompt-container');
        if (!container) return;
        
        container.style.display = selectedStyle === 'custom' ? 'block' : 'none';
    }
    
    // Generate description with resort data
    async function generateDescription(resortData, styleKey = 'default') {
        // Avoid duplicate calls for the same resort and style
        if (this.lastResortName === resortData.name && 
            this.lastStyleKey === styleKey && 
            (styleKey !== 'custom' || this.lastCustomPrompt === customPrompt)) {
            console.log('Skipping duplicate generation for:', resortData.name, 'with style:', styleKey);
            return;
        }
        this.lastResortName = resortData.name;
        this.lastStyleKey = styleKey;
        this.lastCustomPrompt = customPrompt;
        
        // Show loading state
        showLoadingState(resortData.name);
        
        try {
            // Clean the resort data to prevent circular references
            const cleanResortData = JSON.parse(JSON.stringify(resortData));
            
            // Prepare payload, include style prompt if not default
            const styleObj = styleOptions.find(opt => opt.key === styleKey) || styleOptions[0];
            const payload = {
                resortData: cleanResortData
            };
            
            // Use custom prompt if selected, otherwise use predefined prompt
            if (styleKey === 'custom' && customPrompt) {
                payload.stylePrompt = customPrompt;
            } else if (styleObj.prompt) {
                payload.stylePrompt = styleObj.prompt;
            }
            
            console.log('Generating description for:', resortData.name, 'with style:', styleKey);
            console.log('Payload:', JSON.stringify(payload, null, 2).substring(0, 200) + '...');
            
            // Call API
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            // Parse response - handling double-encoded JSON
            const rawData = await response.json();
            console.log('Raw API response:', rawData);
            
            // Handle double-encoded JSON - the description is inside body as a string
            const data = typeof rawData.body === 'string' ? JSON.parse(rawData.body) : rawData.body;
            console.log('Parsed data:', data);
            
            // Extract description
            if (data.description) {
                displayDescription(data.description);
                updateStatus('Description generated!', 'success');
            } else {
                console.warn('No description in parsed data:', data);
                throw new Error('No description returned from API');
            }
            
        } catch (error) {
            console.error('Error generating description:', error);
            displayFallback();
            updateStatus('Error generating description', 'error');
        }

    }
    
    // Show loading state in all output elements
    function showLoadingState(resortName) {
        aiOutputElements.forEach(element => {
            element.innerHTML = `<p class="loading-text">Generating AI description for ${resortName}...</p>`;
        });
        
        updateStatus('Generating...', 'loading');
    }
    
    // Display description in all output elements
    function displayDescription(description) {
        // Format description with paragraphs
        const formattedDescription = description
            .split('\n\n')
            .map(para => `<p>${para}</p>`)
            .join('');
        
        aiOutputElements.forEach(element => {
            element.innerHTML = formattedDescription;
        });
    }
    
    // Display fallback description
    function displayFallback() {
        const fallbackDescription = "This ski resort offers a variety of terrain for all skill levels, from gentle beginner slopes to challenging expert runs. With modern lift systems and well-maintained trails, it provides an exceptional alpine experience in a stunning mountain setting.";
        
        aiOutputElements.forEach(element => {
            element.innerHTML = `<p>${fallbackDescription}</p>`;
        });
    }
    
    // Update status indicator
    function updateStatus(message, type) {
        if (!aiStatus) return;
        
        aiStatus.textContent = message;
        aiStatus.className = `status-indicator ${type || ''}`;
        
        // Clear status after delay if successful
        if (type === 'success') {
            setTimeout(() => {
                aiStatus.textContent = '';
                aiStatus.className = 'status-indicator';
            }, 3000);
        }
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 