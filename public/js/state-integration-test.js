/**
 * State Management Integration Test
 * 
 * This file contains simple tests to verify the state management system
 * is working correctly with the UI components.
 */

const StateIntegrationTest = (function() {
    let testResults = [];
    
    function runTests() {
        console.log('🧪 Running State Management Integration Tests...');
        testResults = [];
        
        // Test 1: AppState initialization
        test('AppState should be available and initialized', () => {
            return window.AppState && typeof window.AppState.getState === 'function';
        });
        
        // Test 2: ComponentIntegration initialization
        test('ComponentIntegration should be available and initialized', () => {
            return window.ComponentIntegration && typeof window.ComponentIntegration.getComponents === 'function';
        });
        
        // Test 3: State subscription system
        test('State subscription system should work', () => {
            let callbackCalled = false;
            const unsubscribe = window.AppState.subscribe('uiPreferencesChange', () => {
                callbackCalled = true;
            });
            
            // Trigger a preferences change event
            window.AppState.updatePreferences({ testFlag: true });
            
            unsubscribe();
            return callbackCalled;
        });
        
        // Test 4: UI preferences persistence
        test('UI preferences should persist to localStorage', () => {
            const testPrefs = { testValue: 'test123' };
            window.AppState.updatePreferences(testPrefs);
            
            const savedPrefs = JSON.parse(localStorage.getItem('webBooster_preferences') || '{}');
            return savedPrefs.testValue === 'test123';
        });
        
        // Test 5: Component references
        test('Component references should be available', () => {
            const components = window.ComponentIntegration.getComponents();
            return components.urlInput && components.startSessionBtn && components.sessionsList;
        });
        
        // Test 6: Session filtering
        test('Session filtering should work', () => {
            // This test assumes some sessions are loaded
            const filteredSessions = window.AppState.getFilteredSessions();
            return Array.isArray(filteredSessions);
        });
        
        // Test 7: Category management
        test('Category management should work', () => {
            const categories = window.AppState.getCategories();
            return Array.isArray(categories) && categories.includes('Uncategorized');
        });
        
        // Display results
        displayResults();
    }
    
    function test(description, testFunction) {
        try {
            const result = testFunction();
            testResults.push({
                description,
                passed: result,
                error: null
            });
            
            console.log(`${result ? '✅' : '❌'} ${description}`);
        } catch (error) {
            testResults.push({
                description,
                passed: false,
                error: error.message
            });
            
            console.log(`❌ ${description} - Error: ${error.message}`);
        }
    }
    
    function displayResults() {
        const passed = testResults.filter(r => r.passed).length;
        const total = testResults.length;
        
        console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! State management system is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Check the implementation.');
            
            // Show failed tests
            testResults.filter(r => !r.passed).forEach(result => {
                console.log(`❌ ${result.description}${result.error ? ` - ${result.error}` : ''}`);
            });
        }
        
        // Create a visual indicator in the UI
        createTestResultsIndicator(passed, total);
    }
    
    function createTestResultsIndicator(passed, total) {
        // Remove existing indicator
        const existing = document.getElementById('test-results-indicator');
        if (existing) {
            existing.remove();
        }
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.id = 'test-results-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${passed === total ? '#28a745' : '#dc3545'};
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        indicator.textContent = `Tests: ${passed}/${total}`;
        indicator.title = `State Management Tests: ${passed} passed, ${total - passed} failed`;
        
        document.body.appendChild(indicator);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 5000);
    }
    
    // Public API
    return {
        runTests,
        getResults: () => [...testResults]
    };
})();

// Auto-run tests when everything is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for state management to be fully initialized
    setTimeout(() => {
        if (window.AppState && window.ComponentIntegration) {
            StateIntegrationTest.runTests();
        } else {
            console.warn('⚠️ State management system not fully loaded, skipping tests');
        }
    }, 2000);
});

// Export for manual testing
window.StateIntegrationTest = StateIntegrationTest;
