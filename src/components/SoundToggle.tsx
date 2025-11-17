import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSound } from '@/contexts/SoundContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const SoundToggle = () => {
  const { isMuted, toggleMute } = useSound();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggleMute} className="text-muted-foreground">
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isMuted ? 'Activar sonidos' : 'Silenciar sonidos'}</p>
      </TooltipContent>
    </Tooltip>
  );
};