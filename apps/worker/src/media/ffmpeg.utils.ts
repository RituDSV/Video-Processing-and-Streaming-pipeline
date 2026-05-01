import { spawn } from 'child_process';

export async function probeVideo(inputPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height:format=duration',
      '-of',
      'json',
      inputPath,
    ];

    const proc = spawn('ffprobe', args);

    let out = '';
    proc.stdout.on('data', (d) => (out += d.toString()));

    proc.on('close', () => {
      try {
        const parsed = JSON.parse(out);
        resolve({
          duration: Number(parsed.format.duration),
          width: Number(parsed.streams[0].width),
          height: Number(parsed.streams[0].height),
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}