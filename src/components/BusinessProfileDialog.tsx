import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, Globe, Clock, Star, Instagram, Facebook, Loader2 } from 'lucide-react';
import { getBusinessCategoryLabel, getBusinessCategoryIcon } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface Business {
  id: string;
  name: string;
  category: string;
  description: string | null;
  town: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  schedule: string | null;
  logo_url: string | null;
  rating_avg: number;
  rating_count: number;
}

interface BusinessImage {
  id: string;
  image_url: string;
  caption: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
}

interface Props {
  business: Business;
  open: boolean;
  onClose: () => void;
  onReviewAdded: () => void;
}

export function BusinessProfileDialog({ business, open, onClose, onReviewAdded }: Props) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    if (open) fetchDetails();
  }, [open, business.id]);

  const fetchDetails = async () => {
    setLoading(true);
    const [imgRes, revRes] = await Promise.all([
      supabase.from('business_images').select('*').eq('business_id', business.id).order('display_order'),
      supabase.from('business_reviews').select('*').eq('business_id', business.id).order('created_at', { ascending: false }),
    ]);
    if (imgRes.data) setImages(imgRes.data as unknown as BusinessImage[]);
    if (revRes.data) setReviews(revRes.data as unknown as Review[]);
    setLoading(false);
  };

  const hasReviewed = reviews.some(r => r.reviewer_id === user?.id);

  const submitReview = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('business_reviews').insert({
        business_id: business.id,
        reviewer_id: user.id,
        rating: newRating,
        comment: newComment || null,
      });
      if (error) throw error;

      // Update business rating avg
      const newCount = business.rating_count + 1;
      const newAvg = ((business.rating_avg * business.rating_count) + newRating) / newCount;
      await supabase.from('businesses').update({
        rating_avg: Math.round(newAvg * 10) / 10,
        rating_count: newCount,
      }).eq('id', business.id);

      toast({ title: '¡Valoración enviada!' });
      setNewComment('');
      setNewRating(5);
      await fetchDetails();
      onReviewAdded();
    } catch {
      toast({ title: 'Error al enviar valoración', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const socialMedia = (business as any).social_media as Record<string, string> | undefined;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{getBusinessCategoryIcon(business.category)}</span>
              )}
            </div>
            <div>
              <DialogTitle>{business.name}</DialogTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {getBusinessCategoryIcon(business.category)} {getBusinessCategoryLabel(business.category)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Info */}
        <div className="space-y-3 text-sm">
          {business.description && <p className="text-muted-foreground">{business.description}</p>}
          
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{business.town}{business.address && ` · ${business.address}`}</span>
            {business.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary" />{business.phone}</span>}
            {business.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary" />{business.email}</span>}
            {business.website && (
              <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <Globe className="h-4 w-4" />Web
              </a>
            )}
            {business.schedule && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" />{business.schedule}</span>}
          </div>

          {socialMedia && (socialMedia.instagram || socialMedia.facebook) && (
            <div className="flex gap-3">
              {socialMedia.instagram && (
                <a href={`https://instagram.com/${socialMedia.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-500 hover:underline text-xs">
                  <Instagram className="h-4 w-4" />{socialMedia.instagram}
                </a>
              )}
              {socialMedia.facebook && (
                <a href={`https://facebook.com/${socialMedia.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                  <Facebook className="h-4 w-4" />{socialMedia.facebook}
                </a>
              )}
            </div>
          )}

          {/* Rating */}
          {business.rating_count > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{business.rating_avg}</span>
              <span className="text-muted-foreground">({business.rating_count} valoraciones)</span>
            </div>
          )}
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Galería</h4>
              <div className="grid grid-cols-3 gap-2">
                {images.map(img => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Reviews */}
        <Separator />
        <div>
          <h4 className="text-sm font-semibold mb-3">Valoraciones</h4>

          {/* Add review (only for non-EMPRESA users who haven't reviewed) */}
          {user && role !== 'EMPRESA' && !hasReviewed && (
            <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2">
              <Label className="text-xs">Tu valoración</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`h-5 w-5 cursor-pointer transition-colors ${
                      s <= (hoveredStar || newRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    }`}
                    onMouseEnter={() => setHoveredStar(s)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setNewRating(s)}
                  />
                ))}
              </div>
              <Textarea placeholder="Comentario (opcional)" value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} />
              <Button size="sm" onClick={submitReview} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Enviar
              </Button>
            </div>
          )}

          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin valoraciones aún</p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {reviews.map(r => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(r.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  {r.comment && <p className="text-muted-foreground mt-0.5">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
