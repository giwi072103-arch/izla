package uz.izla.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.view.View;
import android.view.animation.LinearInterpolator;

/** Offline illustration drawn locally: no network, WebView or downloaded assets. */
public final class OfflineArt extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path slash = new Path();
    private final ValueAnimator animator = ValueAnimator.ofFloat(0f, 1f);
    private float phase;
    public OfflineArt(Context context) {
        super(context);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        animator.setDuration(4800);
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.setInterpolator(new LinearInterpolator());
        animator.addUpdateListener(a -> { phase = (float) a.getAnimatedValue(); invalidate(); });
    }
    private void updateMotion() {
        if (isAttachedToWindow() && isShown() && getWindowVisibility() == VISIBLE && ValueAnimator.areAnimatorsEnabled()) {
            if (!animator.isStarted()) animator.start();
        } else animator.cancel();
    }
    @Override protected void onAttachedToWindow() { super.onAttachedToWindow(); updateMotion(); }
    @Override protected void onDetachedFromWindow() { animator.cancel(); super.onDetachedFromWindow(); }
    @Override protected void onVisibilityChanged(View view, int visibility) { super.onVisibilityChanged(view, visibility); if (animator != null) updateMotion(); }
    @Override protected void onWindowVisibilityChanged(int visibility) { super.onWindowVisibilityChanged(visibility); if (animator != null) updateMotion(); }
    @Override protected void onDraw(Canvas c) {
        super.onDraw(c);
        c.save();
        float scale = Math.min(getWidth() / 320f, getHeight() / 250f);
        c.translate((getWidth()-320*scale)/2, (getHeight()-250*scale)/2);
        c.scale(scale, scale);
        float wave = (float)Math.sin(phase*Math.PI*2);
        paint.setColor(Color.argb(22, 32, 106, 82));
        c.drawOval(92+wave*4, 217, 228-wave*4, 230, paint);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.2f);
        paint.setColor(Color.rgb(188, 215, 204));
        c.save(); c.rotate(-22,160,120); c.drawOval(24,50,296,190,paint); c.restore();
        paint.setStyle(Paint.Style.FILL);
        c.save(); c.translate(0,wave*9); c.rotate(-9,160,120);
        paint.setColor(Color.rgb(32,88,68)); c.drawRoundRect(102,67,224,189,38,38,paint);
        paint.setShader(new LinearGradient(95,50,220,180,new int[]{0xffb6e4cc,0xff60a78b,0xff23694f},null,Shader.TileMode.CLAMP));
        c.drawRoundRect(98,56,220,178,38,38,paint); paint.setShader(null);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.5f); paint.setColor(0xffccebdc);
        c.drawRoundRect(100,58,218,176,37,37,paint);
        paint.setColor(Color.WHITE); paint.setStrokeWidth(4); paint.setStrokeCap(Paint.Cap.ROUND);
        c.drawArc(125,91,193,147,215,110,false,paint);
        c.drawArc(137,106,181,140,220,100,false,paint);
        slash.reset(); slash.moveTo(127,97); slash.lineTo(190,148); c.drawPath(slash,paint);
        paint.setStyle(Paint.Style.FILL); c.drawCircle(159,146,3.5f,paint); c.restore();
        paint.setShader(new LinearGradient(45,70,65,99,0xffe8ddfa,0xffa38ac7,Shader.TileMode.CLAMP));
        c.save(); c.rotate(20,54,82-wave*7); c.drawRoundRect(43,71-wave*7,65,93-wave*7,7,7,paint); c.restore();
        paint.setShader(new LinearGradient(260,160,280,190,0xffffe9cb,0xffe0ac73,Shader.TileMode.CLAMP));
        c.save(); c.rotate(-20,268,178+wave*8); c.drawRoundRect(253,163+wave*8,283,193+wave*8,9,9,paint); c.restore();
        paint.setShader(null); paint.setColor(0xff8fbca6); c.drawCircle(241,39+wave*5,4,paint);
        c.restore();
    }
}
