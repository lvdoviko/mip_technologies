// src/hooks/__tests__/useDebouncedTyping.test.js
import { renderHook, act } from '@testing-library/react';
import { useDebouncedTyping } from '../useDebouncedTyping';

// Mock timers
jest.useFakeTimers();

describe('useDebouncedTyping', () => {
  let onTypingStart;
  let onTypingStop;

  beforeEach(() => {
    onTypingStart = jest.fn();
    onTypingStop = jest.fn();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Basic Functionality', () => {
    test('should initialize with correct default values', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      expect(result.current.isTyping).toBe(false);
      expect(result.current.config.throttleMs).toBe(2000);
      expect(result.current.config.stopDelayMs).toBe(1000);
      expect(result.current.config.enabled).toBe(true);
    });

    test('should call onTypingStart when startTyping is called', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      act(() => {
        result.current.startTyping();
      });

      expect(onTypingStart).toHaveBeenCalledTimes(1);
      expect(result.current.isTyping).toBe(true);
    });

    test('should call onTypingStop after stop delay', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        stopDelayMs: 1000
      }));

      act(() => {
        result.current.startTyping();
      });

      expect(onTypingStart).toHaveBeenCalledTimes(1);

      // Fast-forward time by stop delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onTypingStop).toHaveBeenCalledTimes(1);
    });

    test('should call onTypingStop immediately when stopTyping is called', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      act(() => {
        result.current.startTyping();
      });

      expect(result.current.isTyping).toBe(true);

      act(() => {
        result.current.stopTyping();
      });

      expect(onTypingStop).toHaveBeenCalledTimes(1);
      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('Throttling Behavior', () => {
    test('should throttle rapid typing_start calls', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        throttleMs: 2000
      }));

      // First call should go through
      act(() => {
        result.current.startTyping();
      });
      expect(onTypingStart).toHaveBeenCalledTimes(1);

      // Rapid subsequent calls should be throttled
      act(() => {
        result.current.startTyping();
        result.current.startTyping();
        result.current.startTyping();
      });

      expect(onTypingStart).toHaveBeenCalledTimes(1); // Still only 1
    });

    test('should allow typing_start after throttle period', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        throttleMs: 2000
      }));

      // First call
      act(() => {
        result.current.startTyping();
      });
      expect(onTypingStart).toHaveBeenCalledTimes(1);

      // Stop typing
      act(() => {
        result.current.stopTyping();
      });

      // Advance time past throttle period
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should allow new typing_start
      act(() => {
        result.current.startTyping();
      });
      expect(onTypingStart).toHaveBeenCalledTimes(2);
    });

    test('should throttle rapid typing_stop calls', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        throttleMs: 2000
      }));

      // Start typing
      act(() => {
        result.current.startTyping();
      });

      // First stop should go through
      act(() => {
        result.current.stopTyping();
      });
      expect(onTypingStop).toHaveBeenCalledTimes(1);

      // Rapid subsequent stops should be throttled (after starting again)
      act(() => {
        result.current.startTyping();
      });
      
      act(() => {
        result.current.stopTyping();
        result.current.stopTyping();
        result.current.stopTyping();
      });

      expect(onTypingStop).toHaveBeenCalledTimes(2); // Original + 1 new
    });

    test('should reset stop timeout when continuing to type', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        stopDelayMs: 1000
      }));

      // Start typing
      act(() => {
        result.current.startTyping();
      });

      // Advance time partway
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Continue typing (should reset timeout)
      act(() => {
        result.current.startTyping();
      });

      // Advance another 500ms (original timeout would have expired)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not have stopped yet
      expect(onTypingStop).not.toHaveBeenCalled();

      // Advance remaining time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Now should stop
      expect(onTypingStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track typing statistics correctly', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      // Initial stats
      let stats = result.current.getTypingStats();
      expect(stats.starts).toBe(0);
      expect(stats.stops).toBe(0);
      expect(stats.throttled).toBe(0);

      // Start typing
      act(() => {
        result.current.startTyping();
      });

      stats = result.current.getTypingStats();
      expect(stats.starts).toBe(1);
      expect(stats.stops).toBe(0);

      // Multiple throttled calls
      act(() => {
        result.current.startTyping();
        result.current.startTyping();
      });

      stats = result.current.getTypingStats();
      expect(stats.starts).toBe(1);
      expect(stats.throttled).toBe(2);

      // Stop typing
      act(() => {
        result.current.stopTyping();
      });

      stats = result.current.getTypingStats();
      expect(stats.starts).toBe(1);
      expect(stats.stops).toBe(1);
      expect(stats.throttled).toBe(2);
    });

    test('should calculate reduction percentage correctly', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      // Make 10 calls but only 2 should go through
      act(() => {
        result.current.startTyping(); // Goes through
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.stopTyping(); // Goes through
      });

      const stats = result.current.getTypingStats();
      expect(stats.starts).toBe(1);
      expect(stats.stops).toBe(1);
      expect(stats.throttled).toBe(4);
      expect(stats.reductionPercentage).toBe(67); // 4/(1+1+4) * 100 = 66.67, rounded to 67
    });

    test('should clear statistics', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      // Generate some stats
      act(() => {
        result.current.startTyping();
        result.current.startTyping(); // Throttled
        result.current.stopTyping();
      });

      let stats = result.current.getTypingStats();
      expect(stats.starts).toBe(1);
      expect(stats.stops).toBe(1);
      expect(stats.throttled).toBe(1);

      // Clear stats
      act(() => {
        result.current.clearTypingStats();
      });

      stats = result.current.getTypingStats();
      expect(stats.starts).toBe(0);
      expect(stats.stops).toBe(0);
      expect(stats.throttled).toBe(0);
    });
  });

  describe('Force Operations', () => {
    test('should force stop typing bypassing throttling', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        throttleMs: 5000 // Long throttle
      }));

      // Start typing
      act(() => {
        result.current.startTyping();
      });

      // Stop and immediately force stop again
      act(() => {
        result.current.stopTyping();
        result.current.forceStopTyping();
      });

      // Should have called stop twice despite throttling
      expect(onTypingStop).toHaveBeenCalledTimes(2);
    });

    test('should reset typing state completely', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop
      }));

      // Start typing
      act(() => {
        result.current.startTyping();
      });

      expect(result.current.isTyping).toBe(true);

      // Reset state
      act(() => {
        result.current.resetTypingState();
      });

      expect(result.current.isTyping).toBe(false);

      // Should not automatically stop after reset
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(onTypingStop).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    test('should respect enabled=false', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        enabled: false
      }));

      act(() => {
        result.current.startTyping();
        result.current.stopTyping();
      });

      expect(onTypingStart).not.toHaveBeenCalled();
      expect(onTypingStop).not.toHaveBeenCalled();
    });

    test('should use custom throttle and stop delay values', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        throttleMs: 5000,
        stopDelayMs: 2000
      }));

      expect(result.current.config.throttleMs).toBe(5000);
      expect(result.current.config.stopDelayMs).toBe(2000);

      // Test custom stop delay
      act(() => {
        result.current.startTyping();
      });

      // Advance by less than custom delay
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(onTypingStop).not.toHaveBeenCalled();

      // Advance to reach custom delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onTypingStop).toHaveBeenCalledTimes(1);
    });

    test('should handle missing callbacks gracefully', () => {
      const { result } = renderHook(() => useDebouncedTyping({}));

      expect(() => {
        act(() => {
          result.current.startTyping();
          result.current.stopTyping();
        });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in onTypingStart callback', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart: errorCallback,
        onTypingStop
      }));

      act(() => {
        result.current.startTyping();
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DebouncedTyping] Error in onTypingStart callback:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle errors in onTypingStop callback', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop: errorCallback
      }));

      act(() => {
        result.current.startTyping();
        result.current.stopTyping();
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DebouncedTyping] Error in onTypingStop callback:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    test('should simulate realistic typing session with 90%+ reduction', () => {
      const { result } = renderHook(() => useDebouncedTyping({
        onTypingStart,
        onTypingStop,
        throttleMs: 2000,
        stopDelayMs: 1000
      }));

      // Simulate rapid typing (user typing "hello world")
      act(() => {
        // User starts typing
        result.current.startTyping(); // Event 1 - goes through
        
        // Rapid keystrokes (within throttle window)
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
        result.current.startTyping(); // Throttled
      });

      // User stops typing, auto-stop triggers
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const stats = result.current.getTypingStats();
      
      // Should have 1 start, 1 stop, 10 throttled = 91% reduction
      expect(stats.starts).toBe(1);
      expect(stats.stops).toBe(1);
      expect(stats.throttled).toBe(10);
      expect(stats.reductionPercentage).toBeGreaterThanOrEqual(90);
      
      // Only 2 actual network events instead of 12
      expect(onTypingStart).toHaveBeenCalledTimes(1);
      expect(onTypingStop).toHaveBeenCalledTimes(1);
    });
  });
});