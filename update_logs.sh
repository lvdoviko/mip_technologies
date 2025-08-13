#!/bin/bash

# Replace console.log with logger.debug or logger.info
sed -i "s/console\.log('\([^']*\) \[WebSocket\] \([^']*\)'/logger.debug('WebSocket: \2'/g" src/services/websocketManager.js
sed -i "s/console\.log('\([^']*\) \[Platform\] \([^']*\)'/logger.debug('Platform: \2'/g" src/services/websocketManager.js
sed -i "s/console\.log('\([^']*\) \[EventDedup\] \([^']*\)'/logger.debug('EventDedup: \2'/g" src/services/websocketManager.js
sed -i "s/console\.log('\([^']*\) \[EventNormalizer\] \([^']*\)'/logger.debug('EventNormalizer: \2'/g" src/services/websocketManager.js

# Replace console.error with logger.error
sed -i "s/console\.error('\([^']*\) \[WebSocket\] \([^']*\)'/logger.error('WebSocket: \2'/g" src/services/websocketManager.js

# Replace console.warn with logger.warn
sed -i "s/console\.warn('\([^']*\) \[WebSocket\] \([^']*\)'/logger.warn('WebSocket: \2'/g" src/services/websocketManager.js

echo "Basic replacements complete. Manual review needed for complex console statements."