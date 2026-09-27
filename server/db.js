import pg from 'pg';
import {readFile} from 'node:fs/promises';
export async function database(){
 let pool;
 const persistent=Boolean(process.env.DATABASE_URL);
 if(persistent)pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined});
 else if(process.env.NODE_ENV!=='production'){const {newDb}=await import('pg-mem');const m=newDb();pool=new (m.adapters.createPg().Pool)();}
 else throw new Error('DATABASE_URL is required');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // Transaction-scoped lock serializes migrations across processes and replicas.
  if(persistent)await client.query('SELECT pg_advisory_xact_lock(1748202609)');
  await client.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');client.release();await pool.end();throw e;}
 client.release();
 return pool;
}
