import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionPath = path.join(__dirname, 'whatsapp-session');

function deleteDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      // Tentar remover normalmente
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3 });
      console.log('✅ Sessão removida com sucesso');
    } catch (error) {
      console.log('⚠️ Tentando método alternativo...');
      
      // Método alternativo: renomear e depois deletar
      try {
        const tempPath = dirPath + '_old_' + Date.now();
        fs.renameSync(dirPath, tempPath);
        
        setTimeout(() => {
          try {
            fs.rmSync(tempPath, { recursive: true, force: true, maxRetries: 5 });
            console.log('✅ Sessão removida (método alternativo)');
          } catch (err) {
            console.log('⚠️ Sessão será removida na próxima inicialização');
          }
        }, 2000);
      } catch (renameError) {
        console.error('❌ Erro ao limpar sessão:', renameError.message);
        console.log('💡 Feche todos os processos e tente novamente');
      }
    }
  } else {
    console.log('ℹ️ Nenhuma sessão encontrada');
  }
}

console.log('🗑️ Limpando sessão do WhatsApp...');
deleteDirectory(sessionPath);
console.log('✅ Processo concluído');
