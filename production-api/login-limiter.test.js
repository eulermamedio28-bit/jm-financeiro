import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoginLimiter} from './login-limiter.js';

test('login throttle limits each peer and resets after window',()=>{
 let clock=1000;
 const limiter=createLoginLimiter({limit:2,windowMs:500,now:()=>clock});
 assert.equal(limiter.allow('127.0.0.1'),true);
 assert.equal(limiter.allow('127.0.0.1'),true);
 assert.equal(limiter.allow('127.0.0.1'),false);
 assert.equal(limiter.allow('127.0.0.2'),true);
 clock+=501;
 assert.equal(limiter.allow('127.0.0.1'),true);
});
