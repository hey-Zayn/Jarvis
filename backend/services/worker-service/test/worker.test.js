import { createWorkerJobService } from '../src/services/workerJobService.js';
import { createWorkerJobController } from '../src/controllers/workerJobController.js';

async function runWorkerTests() {
    console.log('=== Starting Phase 6 Worker Service Tests ===\n');

    const service = createWorkerJobService();

    // Test 1: Enqueue Conversation Persistence
    console.log('1. Testing enqueueConversationPersist:');
    const persistRes1 = await service.enqueueConversationPersist({
        idempotencyKey: 'turn-persist-test-1',
        conversationId: 'conv-101',
        turnId: 'turn-1',
        transcript: 'Hello Jarvis',
        agentResponse: 'Hello! How can I help you today?',
        userId: 'user-789'
    });

    console.log(`  Status: ${persistRes1.status.message}, Job ID: ${persistRes1.jobId}`);
    if (!persistRes1.status.ok || !persistRes1.jobId) {
        throw new Error('enqueueConversationPersist failed');
    }

    // Test 2: Idempotency deduplication
    console.log('\n2. Testing Idempotency Deduplication:');
    const persistRes2 = await service.enqueueConversationPersist({
        idempotencyKey: 'turn-persist-test-1',
        conversationId: 'conv-101',
        turnId: 'turn-1',
        transcript: 'Hello Jarvis (Retry)'
    });

    console.log(`  Duplicate attempt status: ${persistRes2.status.message}`);
    if (!persistRes2.status.message.includes('idempotent')) {
        throw new Error('Idempotency deduplication check failed');
    }
    console.log('  -> Idempotency verified!\n');

    // Test 3: Action Log Enqueueing
    console.log('3. Testing enqueueActionLog:');
    const logRes = await service.enqueueActionLog({
        actionType: 'voice_command_executed',
        conversationId: 'conv-101',
        payloadJson: JSON.stringify({ latencyMs: 145, toolCalls: ['get_weather'] })
    });

    console.log(`  Status: ${logRes.status.message}, Job ID: ${logRes.jobId}`);
    if (!logRes.status.ok || !logRes.jobId) {
        throw new Error('enqueueActionLog failed');
    }
    console.log('  -> Action log enqueued!\n');

    // Test 4: Memory Write Job
    console.log('4. Testing enqueueMemoryWrite:');
    const memRes = await service.enqueueMemoryWrite({
        memoryId: 'mem-999',
        userId: 'user-789',
        content: 'User prefers Rust and dark theme',
        category: 'user_preference'
    });

    console.log(`  Status: ${memRes.status.message}, Job ID: ${memRes.jobId}`);
    if (!memRes.status.ok) {
        throw new Error('enqueueMemoryWrite failed');
    }
    console.log('  -> Memory write enqueued!\n');

    // Test 5: Controller Handler
    console.log('5. Testing gRPC Controller Adapter:');
    const controller = createWorkerJobController();

    await new Promise((resolve, reject) => {
        controller.EnqueueActionLog({
            request: {
                idempotency_key: `ctrl-log-${Date.now()}`,
                action_type: 'login_success',
                conversation_id: 'conv-ctrl',
                payload_json: JSON.stringify({ ip: '127.0.0.1' })
            }
        }, (err, res) => {
            if (err) return reject(err);
            console.log(`  gRPC EnqueueActionLog Response: OK=${res.status.ok}, Job ID=${res.job_id}`);
            if (!res.status.ok) return reject(new Error('Controller EnqueueActionLog failed'));
            resolve(res);
        });
    });

    console.log('\n=== ALL PHASE 6 WORKER SERVICE TESTS PASSED! ===');
    process.exit(0);
}

runWorkerTests().catch(err => {
    console.error('Worker test failed:', err);
    process.exit(1);
});
