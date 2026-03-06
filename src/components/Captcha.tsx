import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerified: (verified: boolean) => void;
}

function generateChallenge() {
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 20) + 5;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
      break;
  }

  return { question: `${a} ${op} ${b}`, answer: answer! };
}

export function Captcha({ onVerified }: CaptchaProps) {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setUserAnswer('');
    setError(false);
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    onVerified(false);
  }, []);

  const handleChange = (value: string) => {
    setUserAnswer(value);
    setError(false);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num === challenge.answer) {
      onVerified(true);
    } else {
      onVerified(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium text-foreground select-none tracking-widest" style={{ fontFamily: 'monospace' }}>
            {challenge.question} = ?
          </span>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={refresh} className="shrink-0" aria-label="Nuevo captcha">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <Input
        type="number"
        placeholder="Tu respuesta"
        value={userAnswer}
        onChange={(e) => handleChange(e.target.value)}
        className={error ? 'border-destructive' : ''}
      />
      {error && <p className="text-sm text-destructive">Respuesta incorrecta</p>}
    </div>
  );
}
