import figlet from 'figlet';
import index from './index.html';

const server = Bun.serve({
  port: 8025,
  routes: {
    "/": index, 
    "/q": () => { 
      const body = figlet.textSync('Bun123!'); 
      return new Response(body); 
    } 
  }
});

console.log(`Listening on ${server.url}`);