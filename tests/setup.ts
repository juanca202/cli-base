import { execaSync } from 'execa';

export default function setup(): void {
  execaSync('npm', ['run', 'build'], { stdio: 'inherit' });
}
