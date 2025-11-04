// code.ts - Professional Accessibility Plugin with Advanced Features & Caching
figma.showUI(__html__, { width: 380, height: 750, themeColors: true });

const PLUGIN_VERSION = '1.0.0';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const PLUGIN_DATA_KEY = 'a11y-analysis';

const analysisCache = new Map<string, CachedAnalysis>();

interface CachedAnalysis {
  timestamp: number;
  version: string;
  contentHash: string;
  results: AccessibilityIssue[];
}

interface AccessibilityIssue {
  elementId: string;
  elementName: string;
  issueType: string;
  severity: 'fail' | 'warning';
  wcagLevel: 'AA' | 'AAA';
  currentValue: string;
  requiredValue: string;
  suggestion: string;
  suggestedFix: any;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

let selectedFrame: FrameNode | null = null;
let currentIssues: AccessibilityIssue[] = [];
let overlayFrame: FrameNode | null = null;
let isPaused = false;
let analysisProgress = 0;
let totalElements = 0;

function getCachedAnalysis(frame: FrameNode): CachedAnalysis | null {
  let cached = analysisCache.get(frame.id);

  if (!cached) {
    const pluginData = frame.getPluginData(PLUGIN_DATA_KEY);
    if (pluginData) {
      try {
        cached = JSON.parse(pluginData);
        if (cached) {
          analysisCache.set(frame.id, cached);
        }
      } catch (error) {
        console.error('Failed to parse cached data:', error);
        return null;
      }
    }
  }

  if (!cached) return null;

  if (isCacheValid(frame, cached)) {
    console.log('✓ Using valid cache for:', frame.name);
    return cached;
  }

  console.log('✗ Cache invalid for:', frame.name);
  clearFrameCache(frame);
  return null;
}

function setCachedAnalysis(frame: FrameNode, results: AccessibilityIssue[]): void {
  const cached: CachedAnalysis = {
    timestamp: Date.now(),
    version: PLUGIN_VERSION,
    contentHash: generateContentHash(frame),
    results: results
  };

  analysisCache.set(frame.id, cached);

  try {
    frame.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(cached));
    console.log('✓ Cached analysis for:', frame.name, 'ID:', frame.id);
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

function isCacheValid(frame: FrameNode, cached: CachedAnalysis): boolean {
  if (isExpired(cached.timestamp)) {
    return false;
  }

  if (cached.version !== PLUGIN_VERSION) {
    return false;
  }

  const currentHash = generateContentHash(frame);
  if (currentHash !== cached.contentHash) {
    return false;
  }

  return true;
}

function isExpired(timestamp: number): boolean {
  return (Date.now() - timestamp) > CACHE_DURATION;
}

function clearFrameCache(frame: FrameNode): void {
  analysisCache.delete(frame.id);
  frame.setPluginData(PLUGIN_DATA_KEY, '');
}

function clearAllCaches(): void {
  analysisCache.clear();

  const allFrames = figma.currentPage.findAll(node => node.type === 'FRAME') as FrameNode[];
  allFrames.forEach(frame => {
    if (frame.getPluginData(PLUGIN_DATA_KEY)) {
      frame.setPluginData(PLUGIN_DATA_KEY, '');
    }
  });

  figma.notify('✓ All caches cleared');
}

function generateContentHash(frame: FrameNode): string {
  const fingerprint = {
    childCount: frame.children.length,
    texts: collectTextContent(frame),
    colors: collectColors(frame),
  };

  return simpleHash(JSON.stringify(fingerprint));
}

function collectTextContent(node: SceneNode): string[] {
  const texts: string[] = [];

  function walk(n: SceneNode) {
    if (n.type === 'TEXT') {
      texts.push(n.characters);
    }
    if ('children' in n) {
      n.children.forEach(child => walk(child));
    }
  }

  walk(node);
  return texts;
}

function collectColors(node: SceneNode): string[] {
  const colors: string[] = [];

  function walk(n: SceneNode) {
    if (n.type === 'TEXT') {
      const fills = n.fills;
      if (Array.isArray(fills)) {
        fills.forEach(fill => {
          if (fill.type === 'SOLID') {
            colors.push(`${fill.color.r},${fill.color.g},${fill.color.b}`);
          }
        });
      }
    }
    if ('children' in n) {
      n.children.forEach(child => walk(child));
    }
  }

  walk(node);
  return colors;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  if (ageDays > 0) return `${ageDays}d ago`;
  if (ageHours > 0) return `${ageHours}h ago`;
  if (ageMinutes > 0) return `${ageMinutes}m ago`;
  return 'just now';
}

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'selection-error', message: 'No frame selected' });
    selectedFrame = null;
  } else if (selection.length > 1) {
    figma.ui.postMessage({ type: 'selection-error', message: 'Multiple frames selected. Please select only one frame.' });
    selectedFrame = null;
  } else if (selection[0].type === 'FRAME') {
    selectedFrame = selection[0] as FrameNode;
    figma.ui.postMessage({ type: 'selection-valid', frameName: selectedFrame.name });

    const cached = getCachedAnalysis(selectedFrame);
    if (cached) {
      figma.ui.postMessage({
        type: 'cache-available',
        age: getCacheAge(cached.timestamp)
      });
    }
  } else {
    figma.ui.postMessage({ type: 'selection-error', message: 'Please select a frame (not a single element)' });
    selectedFrame = null;
  }
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'pause-analysis') {
    isPaused = true;
    figma.notify('⏸ Analysis paused');
    figma.ui.postMessage({ type: 'analysis-paused' });
  }

  if (msg.type === 'resume-analysis') {
    isPaused = false;
    figma.notify('▶ Analysis resumed');
    figma.ui.postMessage({ type: 'analysis-resumed' });
  }

  if (msg.type === 'analyze') {
    try {
      console.log('Analysis started');
      isPaused = false;
      analysisProgress = 0;

      if (!selectedFrame) {
        figma.ui.postMessage({ type: 'error', message: 'Please select a frame first' });
        return;
      }

      const forceReanalyze = msg.forceReanalyze || false;

      if (!forceReanalyze) {
        const cached = getCachedAnalysis(selectedFrame);
        if (cached) {
          console.log('⚡ Using cached results');
          const groupedIssues = groupIssuesByElement(cached.results);
          figma.ui.postMessage({
            type: 'analysis-complete',
            issues: groupedIssues,
            totalIssues: cached.results.length,
            fromCache: true,
            cacheAge: getCacheAge(cached.timestamp)
          });

          if (cached.results.length > 0 && msg.showOverlay) {
            currentIssues = cached.results;
            await createOverlayFrame(selectedFrame, cached.results);
          }

          figma.notify(`⚡ Loaded from cache (${getCacheAge(cached.timestamp)})`);
          return;
        }
      }

      console.log('Running fresh analysis');
      const checks = msg.checks;
      currentIssues = [];

      clearOverlays();

      totalElements = countElements(selectedFrame);
      figma.ui.postMessage({ type: 'analysis-progress', progress: 0, total: totalElements });

      console.log('Analyzing frame:', selectedFrame.name, 'with', totalElements, 'elements');
      await analyzeFrame(selectedFrame, checks);
      console.log('Analysis complete. Issues found:', currentIssues.length);

      if (msg.useAI && msg.apiKey) {
        console.log('AI enhancement enabled');
        await enhanceWithAI(currentIssues, msg.apiKey);
      }

      setCachedAnalysis(selectedFrame, currentIssues);

      const groupedIssues = groupIssuesByElement(currentIssues);

      figma.ui.postMessage({
        type: 'analysis-complete',
        issues: groupedIssues,
        totalIssues: currentIssues.length,
        fromCache: false
      });

      if (currentIssues.length > 0 && msg.showOverlay) {
        await createOverlayFrame(selectedFrame, currentIssues);
      }

      figma.notify(`✓ Analysis complete! Found ${currentIssues.length} issues.`);
    } catch (error) {
      console.error('Analysis error:', error);
      figma.ui.postMessage({ type: 'error', message: 'Analysis failed: ' + error });
      figma.notify('❌ Analysis failed. Check console for details.');
    }
  }

  if (msg.type === 'apply-fix') {
    await applyFix(msg.issueIndex, msg.fix);
  }

  if (msg.type === 'toggle-overlay') {
    if (overlayFrame) {
      overlayFrame.visible = msg.visible;
    }
  }

  if (msg.type === 'clear-overlays') {
    clearOverlays();
  }

  if (msg.type === 'jump-to-element') {
    const node = figma.getNodeById(msg.elementId);
    if (node) {
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  }

  if (msg.type === 'clear-cache') {
    if (selectedFrame) {
      clearFrameCache(selectedFrame);
      figma.notify('✓ Cache cleared for this frame');
      figma.ui.postMessage({ type: 'cache-cleared' });
    }
  }

  if (msg.type === 'clear-all-caches') {
    clearAllCaches();
  }

  if (msg.type === 'get-cache-info') {
    if (selectedFrame) {
      const cached = getCachedAnalysis(selectedFrame);
      figma.ui.postMessage({
        type: 'cache-info',
        hasCached: !!cached,
        age: cached ? getCacheAge(cached.timestamp) : null
      });
    }
  }

  if (msg.type === 'save-settings') {
    await figma.clientStorage.setAsync('deepseek_api_key', msg.apiKey);
    await figma.clientStorage.setAsync('use_ai', msg.useAI);
    figma.ui.postMessage({ type: 'settings-saved' });
  }

  if (msg.type === 'load-settings') {
    const apiKey = await figma.clientStorage.getAsync('deepseek_api_key');
    const useAI = await figma.clientStorage.getAsync('use_ai');
    figma.ui.postMessage({
      type: 'settings-loaded',
      apiKey: apiKey || '',
      useAI: useAI || false
    });
  }
};

function countElements(node: SceneNode): number {
  let count = 1;
  if ('children' in node) {
    for (const child of node.children) {
      count += countElements(child);
    }
  }
  return count;
}

async function analyzeFrame(frame: FrameNode, checks: any) {
  let processedElements = 0;

  async function checkNode(node: SceneNode) {
    // Check if paused
    if (isPaused) {
      await new Promise(resolve => {
        const checkPause = setInterval(() => {
          if (!isPaused) {
            clearInterval(checkPause);
            resolve(null);
          }
        }, 100);
      });
    }

    processedElements++;
    analysisProgress = Math.round((processedElements / totalElements) * 100);

    // Send progress update every 10 elements
    if (processedElements % 10 === 0) {
      figma.ui.postMessage({
        type: 'analysis-progress',
        progress: analysisProgress,
        current: processedElements,
        total: totalElements
      });
    }
    if (node.type === 'TEXT') {
      if (checks.colorContrast) {
        await checkTextContrast(node);
      }
      if (checks.textSpacing) {
        checkTextSpacing(node);
      }
      if (checks.lineHeight) {
        checkLineHeight(node);
      }
      if (checks.paragraphSpacing) {
        checkParagraphSpacing(node);
      }
    }

    if (checks.nonTextContrast && (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR')) {
      checkNonTextContrast(node);
    }

    if ('children' in node) {
      for (const child of node.children) {
        await checkNode(child);
      }
    }
  }

  await checkNode(frame);
}

async function checkTextContrast(textNode: TextNode) {
  try {
    // Safely load font with error handling
    const fontName = textNode.fontName;
    if (fontName === figma.mixed) {
      console.log('Mixed fonts detected, skipping:', textNode.name);
      return;
    }

    try {
      await figma.loadFontAsync(fontName as FontName);
    } catch (fontError) {
      console.warn('Font loading failed for:', fontName, '- Using fallback');
      // Try to load Inter Regular as fallback
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      } catch (fallbackError) {
        console.error('Fallback font also failed, skipping node');
        figma.ui.postMessage({
          type: 'font-error',
          message: `Could not load font: ${JSON.stringify(fontName)}`,
          node: textNode.name
        });
        return;
      }
    }
    
    const fontSize = textNode.fontSize as number;
    const bgColor = getBackgroundColor(textNode);
    const textColor = getTextColor(textNode);

    if (!bgColor || !textColor) return;

    const ratio = getContrastRatio(textColor, bgColor);
    
    // Get font weight safely - handle symbol type
    let fontWeight = 400;
    const rawFontWeight = textNode.fontWeight;
    
    if (typeof rawFontWeight === 'number') {
      fontWeight = rawFontWeight;
    } else if (fontName && typeof fontName === 'object' && 'style' in fontName) {
      const style = fontName.style.toLowerCase();
      if (style.includes('black') || style.includes('heavy')) fontWeight = 900;
      else if (style.includes('bold')) fontWeight = 700;
      else if (style.includes('semibold')) fontWeight = 600;
      else if (style.includes('medium')) fontWeight = 500;
      else if (style.includes('light')) fontWeight = 300;
      else if (style.includes('thin')) fontWeight = 100;
    }
    
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);

    const aaRequired = isLargeText ? 3.0 : 4.5;
    const aaaRequired = isLargeText ? 4.5 : 7.0;

    const bounds = textNode.absoluteBoundingBox;

    if (ratio < aaRequired) {
      const suggestedColor = calculateBetterColor(textColor, bgColor, aaRequired);
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Color Contrast',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `${aaRequired}:1`,
        suggestion: `Change text color to ${rgbToHex(suggestedColor)} to meet AA standards`,
        suggestedFix: { type: 'textColor', value: suggestedColor },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    } else if (ratio < aaaRequired) {
      const suggestedColor = calculateBetterColor(textColor, bgColor, aaaRequired);
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Color Contrast',
        severity: 'warning',
        wcagLevel: 'AAA',
        currentValue: `${ratio.toFixed(2)}:1`,
        requiredValue: `${aaaRequired}:1`,
        suggestion: `Change text color to ${rgbToHex(suggestedColor)} for AAA compliance`,
        suggestedFix: { type: 'textColor', value: suggestedColor },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking text contrast:', textNode.name, error);
  }
}

function checkTextSpacing(textNode: TextNode) {
  try {
    const fontSize = textNode.fontSize as number;
    const letterSpacing = textNode.letterSpacing as LetterSpacing;
    
    let currentSpacing = 0;
    if (letterSpacing.unit === 'PIXELS') {
      currentSpacing = letterSpacing.value;
    } else if (letterSpacing.unit === 'PERCENT') {
      currentSpacing = (letterSpacing.value / 100) * fontSize;
    }

    const requiredSpacing = fontSize * 0.12;
    const bounds = textNode.absoluteBoundingBox;

    if (currentSpacing < requiredSpacing) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Text Spacing',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${currentSpacing.toFixed(1)}px`,
        requiredValue: `${requiredSpacing.toFixed(1)}px (0.12em)`,
        suggestion: `Increase letter spacing to ${requiredSpacing.toFixed(1)}px`,
        suggestedFix: { type: 'letterSpacing', value: requiredSpacing },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking text spacing:', textNode.name, error);
  }
}

function checkLineHeight(textNode: TextNode) {
  try {
    const fontSize = textNode.fontSize as number;
    const lineHeight = textNode.lineHeight as LineHeight;
    
    let currentLineHeight = 0;
    if (lineHeight.unit === 'PIXELS') {
      currentLineHeight = lineHeight.value;
    } else if (lineHeight.unit === 'PERCENT') {
      currentLineHeight = (lineHeight.value / 100) * fontSize;
    } else {
      currentLineHeight = fontSize * 1.5;
    }

    const requiredLineHeight = fontSize * 1.5;
    const bounds = textNode.absoluteBoundingBox;

    if (currentLineHeight < requiredLineHeight) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Line Height',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${currentLineHeight.toFixed(1)}px`,
        requiredValue: `${requiredLineHeight.toFixed(1)}px (1.5x)`,
        suggestion: `Increase line height to ${requiredLineHeight.toFixed(1)}px`,
        suggestedFix: { type: 'lineHeight', value: requiredLineHeight },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking line height:', textNode.name, error);
  }
}

function checkParagraphSpacing(textNode: TextNode) {
  try {
    const fontSize = textNode.fontSize as number;
    const paragraphSpacing = textNode.paragraphSpacing;
    const requiredSpacing = fontSize * 2.0;
    const bounds = textNode.absoluteBoundingBox;

    if (paragraphSpacing < requiredSpacing) {
      currentIssues.push({
        elementId: textNode.id,
        elementName: textNode.name,
        issueType: 'Paragraph Spacing',
        severity: 'fail',
        wcagLevel: 'AA',
        currentValue: `${paragraphSpacing.toFixed(1)}px`,
        requiredValue: `${requiredSpacing.toFixed(1)}px (2.0x)`,
        suggestion: `Increase paragraph spacing to ${requiredSpacing.toFixed(1)}px`,
        suggestedFix: { type: 'paragraphSpacing', value: requiredSpacing },
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
      });
    }
  } catch (error) {
    console.error('Error checking paragraph spacing:', textNode.name, error);
  }
}

function checkNonTextContrast(node: SceneNode) {
  const fills = 'fills' in node ? node.fills : [];
  if (Array.isArray(fills) && fills.length > 0) {
    const fill = fills[0];
    if (fill.type === 'SOLID') {
      const bgColor = getBackgroundColor(node);
      if (bgColor) {
        const ratio = getContrastRatio(fill.color, bgColor);
        const bounds = 'absoluteBoundingBox' in node ? node.absoluteBoundingBox : null;
        if (ratio < 3.0) {
          currentIssues.push({
            elementId: node.id,
            elementName: node.name,
            issueType: 'Non-text Contrast',
            severity: 'fail',
            wcagLevel: 'AA',
            currentValue: `${ratio.toFixed(2)}:1`,
            requiredValue: `3.0:1`,
            suggestion: `Increase contrast between element and background`,
            suggestedFix: { type: 'fillColor', value: fill.color },
            bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : undefined
          });
        }
      }
    }
  }
}

async function enhanceWithAI(issues: AccessibilityIssue[], apiKey: string) {
  try {
    console.log('Starting AI enhancement with DeepSeek...');

    const prompt = `You are an accessibility expert. Given these WCAG issues, provide better, context-aware suggestions in JSON format. Keep suggestions concise and actionable.

Issues: ${JSON.stringify(issues.map(i => ({
  element: i.elementName,
  issue: i.issueType,
  current: i.currentValue,
  required: i.requiredValue
})))}

Return ONLY a JSON array with improved suggestions, one per issue, in the same order. Each item should be a string.`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status, response.statusText);
      figma.notify('AI enhancement failed. Using standard suggestions.');
      return;
    }

    const data = await response.json();
    console.log('AI response received');

    const aiSuggestions = JSON.parse(data.choices[0].message.content);

    issues.forEach((issue, index) => {
      if (aiSuggestions[index]) {
        issue.suggestion = aiSuggestions[index];
      }
    });

    console.log('AI enhancement completed successfully');
    figma.notify('✨ AI suggestions applied!');
  } catch (error) {
    console.error('AI enhancement error:', error);
    figma.notify('AI enhancement failed. Using standard suggestions.');
  }
}

async function createOverlayFrame(targetFrame: FrameNode, issues: AccessibilityIssue[]) {
  const frameBounds = targetFrame.absoluteBoundingBox;
  if (!frameBounds) return;

  console.log('Creating overlay for', issues.length, 'issues');

  // Clear any existing overlays first
  clearOverlays();

  overlayFrame = figma.createFrame();
  overlayFrame.name = '🔍 A11Y Overlay';
  overlayFrame.resize(frameBounds.width, frameBounds.height);
  overlayFrame.x = frameBounds.x;
  overlayFrame.y = frameBounds.y;
  overlayFrame.fills = [];
  overlayFrame.locked = true;
  overlayFrame.opacity = 1;

  if (targetFrame.parent && 'insertChild' in targetFrame.parent) {
    const targetIndex = targetFrame.parent.children.indexOf(targetFrame);
    targetFrame.parent.insertChild(targetIndex + 1, overlayFrame);
  }

  // Load font once for all labels
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  } catch (error) {
    console.error('Failed to load font for overlay labels:', error);
    // Try fallback fonts
    try {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
    } catch (fallbackError) {
      try {
        await figma.loadFontAsync({ family: 'Arial', style: 'Regular' });
      } catch (finalError) {
        console.error('All fonts failed, overlay will have no labels');
        figma.notify('⚠ Overlay created but labels failed to load');
      }
    }
  }

  // Create highlight boxes for each issue
  let createdCount = 0;
  for (const issue of issues) {
    if (issue.bounds && overlayFrame) {
      try {
        const box = figma.createRectangle();
        box.name = `Issue: ${issue.issueType}`;

        box.x = issue.bounds.x - frameBounds.x;
        box.y = issue.bounds.y - frameBounds.y;
        box.resize(issue.bounds.width, issue.bounds.height);

        const color = issue.severity === 'fail'
          ? { r: 0.95, g: 0.26, b: 0.21 }
          : { r: 1, g: 0.76, b: 0.03 };

        box.fills = [];
        box.strokes = [{ type: 'SOLID', color }];
        box.strokeWeight = 3;
        box.dashPattern = [8, 4];
        box.opacity = 0.9;

        overlayFrame.appendChild(box);

        // Try to add label (may fail if font loading failed)
        try {
          const label = figma.createText();
          label.characters = issue.severity === 'fail' ? '✕' : '⚠';
          label.fontSize = 16;
          label.fills = [{ type: 'SOLID', color }];
          label.x = box.x - 12;
          label.y = box.y - 22;
          overlayFrame.appendChild(label);
        } catch (labelError) {
          console.warn('Failed to create label:', labelError);
        }

        createdCount++;
      } catch (error) {
        console.error('Failed to create overlay element:', error);
      }
    }
  }

  console.log('Overlay created with', createdCount, 'elements');
  figma.notify(`✓ Overlay created with ${createdCount} highlighted issues!`);
}

function clearOverlays() {
  try {
    // Clear the tracked overlay frame
    if (overlayFrame) {
      try {
        overlayFrame.remove();
      } catch (error) {
        console.warn('Failed to remove tracked overlay:', error);
      }
      overlayFrame = null;
    }

    // Find and remove any orphaned overlays
    const orphanedOverlays = figma.currentPage.findAll(node => node.name === '🔍 A11Y Overlay');
    console.log('Found', orphanedOverlays.length, 'orphaned overlays to clean up');

    orphanedOverlays.forEach(node => {
      try {
        // Check if node still exists in the document before removing
        if (node && node.parent) {
          node.remove();
        }
      } catch (error) {
        console.warn('Failed to remove orphaned overlay:', error);
        // Node might have already been deleted, continue
      }
    });

    console.log('Overlays cleared successfully');
  } catch (error) {
    console.error('Error in clearOverlays:', error);
  }
}

function getTextColor(node: TextNode): RGB | null {
  const fills = node.fills;
  if (Array.isArray(fills) && fills.length > 0) {
    const fill = fills[0];
    if (fill.type === 'SOLID') {
      return fill.color;
    }
  }
  return null;
}

function getBackgroundColor(node: SceneNode): RGB | null {
  let parent = node.parent;
  while (parent) {
    if ('fills' in parent) {
      const fills = parent.fills;
      if (Array.isArray(fills) && fills.length > 0) {
        const fill = fills[0];
        if (fill.type === 'SOLID') {
          return fill.color;
        }
      }
    }
    parent = parent.parent;
  }
  return { r: 1, g: 1, b: 1 };
}

function getContrastRatio(color1: RGB, color2: RGB): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: RGB): number {
  const r = color.r <= 0.03928 ? color.r / 12.92 : Math.pow((color.r + 0.055) / 1.055, 2.4);
  const g = color.g <= 0.03928 ? color.g / 12.92 : Math.pow((color.g + 0.055) / 1.055, 2.4);
  const b = color.b <= 0.03928 ? color.b / 12.92 : Math.pow((color.b + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateBetterColor(textColor: RGB, bgColor: RGB, targetRatio: number): RGB {
  const bgLum = getLuminance(bgColor);
  const textLum = getLuminance(textColor);
  
  if (textLum > bgLum) {
    return adjustColorToRatio(textColor, bgColor, targetRatio, 'lighter');
  } else {
    return adjustColorToRatio(textColor, bgColor, targetRatio, 'darker');
  }
}

function adjustColorToRatio(color: RGB, bg: RGB, targetRatio: number, direction: 'lighter' | 'darker'): RGB {
  let newColor = { ...color };
  const step = direction === 'darker' ? -0.05 : 0.05;
  
  for (let i = 0; i < 20; i++) {
    newColor.r = Math.max(0, Math.min(1, newColor.r + step));
    newColor.g = Math.max(0, Math.min(1, newColor.g + step));
    newColor.b = Math.max(0, Math.min(1, newColor.b + step));
    
    if (getContrastRatio(newColor, bg) >= targetRatio) {
      return newColor;
    }
  }
  
  return newColor;
}

function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function groupIssuesByElement(issues: AccessibilityIssue[]) {
  const grouped: { [key: string]: AccessibilityIssue[] } = {};
  
  issues.forEach((issue, index) => {
    const key = `${issue.elementName}_${issue.elementId}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({ ...issue, index } as any);
  });
  
  return Object.entries(grouped).map(([key, issues]) => ({
    elementName: issues[0].elementName,
    elementId: issues[0].elementId,
    issues: issues
  }));
}

async function applyFix(issueIndex: number, fix: any) {
  const issue = currentIssues[issueIndex];
  const node = figma.getNodeById(issue.elementId);
  
  if (!node) {
    figma.ui.postMessage({ type: 'error', message: 'Element not found' });
    return;
  }

  try {
    if (fix.type === 'textColor' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.fills = [{ type: 'SOLID', color: fix.value }];
    } else if (fix.type === 'letterSpacing' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.letterSpacing = { value: fix.value, unit: 'PIXELS' };
    } else if (fix.type === 'lineHeight' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.lineHeight = { value: fix.value, unit: 'PIXELS' };
    } else if (fix.type === 'paragraphSpacing' && node.type === 'TEXT') {
      await figma.loadFontAsync(node.fontName as FontName);
      node.paragraphSpacing = fix.value;
    }

    figma.ui.postMessage({ type: 'fix-applied', message: 'Fix applied successfully!' });
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: 'Failed to apply fix' });
  }
}