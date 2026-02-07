import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Store, Phone, Calendar, Clock, ShoppingBag, Ruler } from 'lucide-react';
import { getCategoryLabel, getCategoryColor, requiresSize } from '@/lib/constants';
import { format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Offer {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  town: string;
  price: number;
  store_name: string;
  contact: string;
  image_url?: string | null;
  expires_at?: string | null;
  created_at: string;
  size?: string | null;
}

interface OfferCardProps {
  offer: Offer;
  onClick?: () => void;
  onReserve?: (offer: Offer) => void;
  showReserveButton?: boolean;
}

export function OfferCard({ offer, onClick, onReserve, showReserveButton = false }: OfferCardProps) {
  const isExpired = offer.expires_at && isPast(parseISO(offer.expires_at));
  
  const handleReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReserve?.(offer);
  };
  
  return (
    <Card 
      className={`group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        isExpired ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {offer.image_url ? (
          <img
            src={offer.image_url}
            alt={offer.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Store className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Category Badge */}
        <Badge 
          className={`absolute top-3 left-3 ${getCategoryColor(offer.category)} text-white border-0`}
        >
          {getCategoryLabel(offer.category)}
        </Badge>

        {/* Size Badge */}
        {offer.size && requiresSize(offer.category) && (
          <Badge 
            variant="secondary"
            className="absolute top-3 left-24"
          >
            <Ruler className="h-3 w-3 mr-1" />
            {offer.size}
          </Badge>
        )}

        {/* Expired Badge */}
        {isExpired && (
          <Badge 
            variant="destructive"
            className="absolute top-3 right-3"
          >
            Expirada
          </Badge>
        )}

        {/* Price */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
          <span className="text-lg font-bold text-primary">
            {offer.price.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {offer.title}
        </h3>
        
        {offer.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {offer.description}
          </p>
        )}

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary/70" />
            <span className="truncate">{offer.store_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary/70" />
            <span className="truncate">{offer.town}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary/70" />
            <span className="truncate">{offer.contact}</span>
          </div>
        </div>

        {/* Reserve Button */}
        {showReserveButton && !isExpired && (
          <Button 
            className="w-full mt-3" 
            size="sm"
            onClick={handleReserve}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Reservar
          </Button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(parseISO(offer.created_at), 'd MMM yyyy', { locale: es })}
          </div>
          {offer.expires_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Exp: {format(parseISO(offer.expires_at), 'd MMM', { locale: es })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
