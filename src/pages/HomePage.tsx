import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Upload, Download, Trash2, CheckCircle2, ImagePlus, X, RotateCw, Maximize2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { readMP3Metadata, writeMP3Metadata } from '@/lib/mp3';
import { compressImage, arrayBufferToBase64 } from '@/lib/image';
import type { MP3Metadata } from '@/types';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MP3Metadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'audio/mpeg' && !selectedFile.name.toLowerCase().endsWith('.mp3')) {
        toast.error('仅支持 MP3 格式文件');
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.warning('文件较大，处理可能需要一些时间');
      }
      await processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    const toastId = toast.loading('正在解析 MP3 元数据...');
    setLoading(true);
    try {
      // The library might fail on some non-standard MP3s, we handle this in readMP3Metadata
      const meta = await readMP3Metadata(selectedFile);
      setFile(selectedFile);
      setMetadata(meta);
      setCurrentImageIndex(0);
      setRotation(0);
      
      // Check if metadata was actually read or if we got the fallback
      const textFields = [meta.title, meta.artist, meta.album, meta.year, meta.genre, meta.comment, meta.trackNumber, meta.composer];
      const isFallback = textFields.every(v => !v) && (!meta.covers || meta.covers.length === 0);
      
      if (isFallback) {
        toast.warning('读取完成，但未发现有效元信息，您可以手动补充', { id: toastId });
      } else {
        toast.success('元数据读取成功', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('文件解析失败，请检查文件格式', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== 'audio/mpeg' && !droppedFile.name.toLowerCase().endsWith('.mp3')) {
        toast.error('仅支持 MP3 格式文件');
        return;
      }
      await processFile(droppedFile);
    }
  };

  const handleMetadataChange = (field: keyof MP3Metadata, value: any) => {
    if (metadata) {
      setMetadata({ ...metadata, [field]: value });
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const coverFile = e.target.files?.[0];
    if (coverFile) {
      if (!coverFile.type.startsWith('image/')) {
        toast.error('请选择有效的图片文件');
        return;
      }
      
      const toastId = toast.loading('正在压缩封面...');
      try {
        const compressed = await compressImage(coverFile, 600, 600, 0.8);
        const newCovers = metadata?.covers ? [...metadata.covers] : [];
        if (newCovers.length > 0) {
          newCovers[0] = { ...compressed, type: 3 }; // Replace primary
        } else {
          newCovers.push({ ...compressed, type: 3 });
        }
        handleMetadataChange('covers', newCovers);
        toast.success('封面已更新', { id: toastId });
      } catch (err) {
        console.error(err);
        toast.error('封面处理失败', { id: toastId });
      }
    }
  };

  const removeCover = () => {
    handleMetadataChange('covers', []);
    toast.info('封面已移除');
  };

  const handleSaveAndDownload = async () => {
    if (!file || !metadata) return;

    setSaving(true);
    try {
      const modifiedBlob = await writeMP3Metadata(file, metadata);
      const url = URL.createObjectURL(modifiedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `[Edited] ${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('保存并下载成功！');
    } catch (err) {
      console.error(err);
      toast.error('保存文件失败');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setMetadata(null);
  };

  const PRESET_GENRES = [
    { label: '流行 (Pop)', value: 'Pop' },
    { label: '摇滚 (Rock)', value: 'Rock' },
    { label: '古典 (Classical)', value: 'Classical' },
    { label: '爵士 (Jazz)', value: 'Jazz' },
    { label: '电子 (Electronic)', value: 'Electronic' },
    { label: '民谣 (Folk)', value: 'Folk' },
    { label: '嘻哈 (Hip Hop)', value: 'Hip Hop' },
    { label: '乡村 (Country)', value: 'Country' },
    { label: '金属 (Metal)', value: 'Metal' },
    { label: '蓝调 (Blues)', value: 'Blues' },
    { label: '灵魂乐 (Soul)', value: 'Soul' },
    { label: '节奏蓝调 (R&B)', value: 'R&B' },
    { label: '雷歌 (Reggae)', value: 'Reggae' },
    { label: '朋克 (Punk)', value: 'Punk' },
    { label: '独立音乐 (Indie)', value: 'Indie' },
  ];

  // If the metadata genre is not in the preset list, add it as a temporary option
  const getDisplayGenres = () => {
    const currentGenre = metadata?.genre;
    if (currentGenre && !PRESET_GENRES.find(g => g.value.toLowerCase() === currentGenre.toLowerCase())) {
      return [{ label: `${currentGenre} (当前)`, value: currentGenre }, ...PRESET_GENRES];
    }
    return PRESET_GENRES;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Main Content */}
      <main className="w-full p-6 md:p-10 lg:p-12 flex flex-col items-center">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">MP3 元信息编辑器</h1>
            <p className="text-muted-foreground">简单易用的在线 ID3 标签编辑工具</p>
          </div>

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
              >
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`
                    relative rounded-2xl border-2 border-dashed transition-all duration-300
                    flex flex-col items-center justify-center p-12 md:p-20
                    ${dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/25 bg-muted/10'}
                  `}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/mpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="bg-primary/10 p-4 rounded-full mb-6">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-center px-4">拖拽 MP3 文件到此处或点击上传</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-6 px-4">
                    支持 MP3 格式，推荐大小不超过 100MB
                  </p>
                  <Button 
                    variant="default" 
                    className="relative z-10" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    选择文件
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-lg">
                      <Music className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg truncate max-w-[150px] md:max-w-md">{file.name}</h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        正在编辑...
                        <label className="text-primary hover:underline cursor-pointer font-medium ml-2">
                          更换文件
                          <input type="file" accept="audio/mpeg" className="hidden" onChange={handleFileChange} />
                        </label>
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={reset} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    放弃
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>元信息详情</CardTitle>
                    <CardDescription>编辑歌曲的 ID3 标签信息及专辑封面</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Album Cover Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="relative group shrink-0">
                        <div 
                          className={`w-48 h-48 rounded-xl overflow-hidden bg-muted flex items-center justify-center border-2 border-muted shadow-lg transition-all group-hover:border-primary/50 ${metadata?.covers && metadata.covers.length > 0 ? 'cursor-zoom-in' : ''}`}
                          onClick={() => metadata?.covers && metadata.covers.length > 0 && setPreviewOpen(true)}
                        >
                          {metadata?.covers && metadata.covers.length > 0 ? (
                            <img
                              src={arrayBufferToBase64(metadata.covers[0].data, metadata.covers[0].format)}
                              alt="Album Cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-16 h-16 text-muted-foreground opacity-20" />
                          )}
                        </div>
                        
                        {metadata?.covers && metadata.covers.length > 1 && (
                          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">
                            +{metadata.covers.length - 1}
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl pointer-events-none">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="rounded-full w-10 h-10 pointer-events-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              coverInputRef.current?.click();
                            }}
                            title="更换封面"
                          >
                            <ImagePlus className="w-5 h-5" />
                          </Button>
                          {metadata?.covers && metadata.covers.length > 0 && (
                            <>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="rounded-full w-10 h-10 pointer-events-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewOpen(true);
                                }}
                                title="放大预览"
                              >
                                <Maximize2 className="w-5 h-5" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="rounded-full w-10 h-10 pointer-events-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCover();
                                }}
                                title="移除封面"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={coverInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleCoverChange}
                        />
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">标题</Label>
                          <Input
                            id="title"
                            value={metadata?.title || ''}
                            onChange={(e) => handleMetadataChange('title', e.target.value)}
                            placeholder="输入歌曲标题"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="artist">艺术家</Label>
                          <Input
                            id="artist"
                            value={metadata?.artist || ''}
                            onChange={(e) => handleMetadataChange('artist', e.target.value)}
                            placeholder="输入艺术家名称"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="album">专辑</Label>
                          <Input
                            id="album"
                            value={metadata?.album || ''}
                            onChange={(e) => handleMetadataChange('album', e.target.value)}
                            placeholder="输入专辑名称"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year">发行年份</Label>
                          <Input
                            id="year"
                            value={metadata?.year || ''}
                            onChange={(e) => handleMetadataChange('year', e.target.value)}
                            placeholder="例如: 2024"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trackNumber">音轨号</Label>
                          <Input
                            id="trackNumber"
                            value={metadata?.trackNumber || ''}
                            onChange={(e) => handleMetadataChange('trackNumber', e.target.value)}
                            placeholder="例如: 1 或 1/12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="composer">作曲家</Label>
                          <Input
                            id="composer"
                            value={metadata?.composer || ''}
                            onChange={(e) => handleMetadataChange('composer', e.target.value)}
                            placeholder="输入作曲家名称"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="genre">流派</Label>
                          <Select 
                            value={metadata?.genre || ''} 
                            onValueChange={(value) => handleMetadataChange('genre', value)}
                          >
                            <SelectTrigger id="genre" className="w-full">
                              <SelectValue placeholder="选择音乐流派" />
                            </SelectTrigger>
                            <SelectContent>
                              {getDisplayGenres().map((g) => (
                                <SelectItem key={g.value} value={g.value}>
                                  {g.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comment">备注</Label>
                          <Input
                            id="comment"
                            value={metadata?.comment || ''}
                            onChange={(e) => handleMetadataChange('comment', e.target.value)}
                            placeholder="添加备注信息"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      所有修改将保存在下载的文件中
                    </div>
                    <Button onClick={handleSaveAndDownload} disabled={saving} size="lg">
                      {saving ? (
                        <>正在保存...</>
                      ) : (
                        <>
                          <Download className="w-5 h-5 mr-2" />
                          保存并下载
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="pt-12 border-t">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              功能特点
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "隐私保护", desc: "所有编辑操作都在您的浏览器本地完成，文件不会上传到任何服务器（除非您选择云备份）" },
                { title: "全标准支持", desc: "支持标准 ID3v2 标签，兼容所有主流播放器和音乐管理软件" },
                { title: "极速体验", desc: "采用高性能元数据解析引擎，即便是大体积文件也能瞬间完成读写" }
              ].map((feature, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-20 py-10 text-center text-sm text-muted-foreground border-t w-full">
          <p>© 2026 MP3 元信息编辑器 - 开源、安全、极速</p>
        </footer>
      </main>

      {/* Album Cover Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open);
        if (!open) {
          setRotation(0);
          setCurrentImageIndex(0);
        }
      }}>
        <DialogContent className="max-w-3xl sm:max-w-2xl p-0 overflow-hidden bg-black/95 border-none flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 bg-gradient-to-b from-black/80 to-black/40 shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              封面预览 {metadata?.covers && metadata.covers.length > 1 && `(${currentImageIndex + 1}/${metadata.covers.length})`}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {metadata?.covers?.[currentImageIndex]?.description || '专辑封面'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative flex-1 flex items-center justify-center p-4 md:p-8 min-h-[300px] overflow-hidden group/preview">
            {metadata?.covers && metadata.covers.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.img
                  key={`preview-${currentImageIndex}`}
                  src={arrayBufferToBase64(metadata.covers[currentImageIndex].data, metadata.covers[currentImageIndex].format)}
                  alt="Large Album Cover"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, rotate: rotation }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="max-w-full max-h-full object-contain shadow-2xl"
                />
              </AnimatePresence>
            )}

            {/* Navigation Controls */}
            {metadata?.covers && metadata.covers.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 md:group-hover/preview:opacity-100 transition-opacity z-30"
                  onClick={() => {
                    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : metadata.covers!.length - 1));
                    setRotation(0);
                  }}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 md:group-hover/preview:opacity-100 transition-opacity z-30"
                  onClick={() => {
                    setCurrentImageIndex(prev => (prev < metadata.covers!.length - 1 ? prev + 1 : 0));
                    setRotation(0);
                  }}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}
          </div>

          <div className="p-4 md:p-6 bg-black/40 flex justify-center gap-4 shrink-0 border-t border-white/10">
            <Button 
              variant="secondary" 
              onClick={() => setRotation(r => r + 90)}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              顺时针旋转
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setPreviewOpen(false)}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
