export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  public?: boolean;
}

export interface MP3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  comment?: string;
  trackNumber?: string;
  composer?: string;
  originalArtist?: string;
  covers?: {
    data: ArrayBuffer;
    format: string;
    description?: string;
    type?: string | number;
  }[];
}

export interface EditRecord extends MP3Metadata {
  id: string;
  filename: string;
  created_at: string;
}
