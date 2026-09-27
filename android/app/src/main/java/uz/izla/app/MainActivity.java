package uz.izla.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Arrays;

/** Online Android client. No JavaScript bridge and no file-system access. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://izla-production.up.railway.app";
    private static final int CAMERA_REQUEST = 10;
    private static final int LOCATION_REQUEST = 11;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private PermissionRequest cameraRequest;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private boolean mainFrameFailed;

    private boolean trusted(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
            && "izla-production.up.railway.app".equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443)
            && uri.getUserInfo() == null;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private boolean has(String permission) { return checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED; }
    private void toast(int message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 247, 246));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets padding = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(padding.left, padding.top, padding.right, padding.bottom);
                return insets;
            });
        } else root.setFitsSystemWindows(true);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " IZLA-Android/1.0.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(false);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP));
        createErrorPanel(root);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                if (trusted(request.getUrl())) return false;
                if (request.hasGesture()) openExternal(request.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                revokePendingPermissions();
                mainFrameFailed = false;
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                if (!mainFrameFailed) errorPanel.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // Never bypass a TLS validation failure.
                if (error.getUrl() != null && error.getUrl().equals(view.getUrl())) showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!trusted(request.getOrigin()) || !trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))
                        || !Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                        || cameraRequest != null) { request.deny(); return; }
                    if (has(Manifest.permission.CAMERA)) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        cameraRequest = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (cameraRequest == request) cameraRequest = null;
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!trusted(Uri.parse(origin)) || locationCallback != null) { callback.invoke(origin, false, false); return; }
                if (has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    callback.invoke(origin, true, false);
                } else {
                    locationOrigin = origin;
                    locationCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
                }
            }
            @Override public void onGeolocationPermissionsHidePrompt() { locationCallback = null; locationOrigin = null; }
            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        Uri uri = req.getUrl();
                        if (trusted(uri)) web.loadUrl(uri.toString()); else openExternal(uri);
                        v.destroy();
                        return true;
                    }
                });
                ((WebView.WebViewTransport) resultMsg.obj).setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
            // Deliberately no file picker: photos are taken through getUserMedia.
            @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                callback.onReceiveValue(null);
                return true;
            }
        });
        if (state == null || web.restoreState(state) == null) web.loadUrl(ORIGIN);
    }

    private void createErrorPanel(FrameLayout root) {
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        errorPanel.setBackgroundColor(Color.rgb(245, 247, 246));
        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextSize(24);
        title.setTextColor(Color.rgb(32, 106, 82));
        title.setGravity(Gravity.CENTER);
        errorPanel.addView(title);
        TextView text = new TextView(this);
        text.setText(R.string.offline_body);
        text.setTextSize(16);
        text.setTextColor(Color.rgb(70, 80, 73));
        text.setGravity(Gravity.CENTER);
        text.setPadding(0, dp(20), 0, dp(20));
        errorPanel.addView(text);
        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(v -> { errorPanel.setVisibility(View.GONE); web.loadUrl(ORIGIN); });
        errorPanel.addView(retry);
        root.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
        errorPanel.setVisibility(View.GONE);
    }
    private void showError() { mainFrameFailed = true; progress.setVisibility(View.GONE); errorPanel.setVisibility(View.VISIBLE); }
    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        Intent intent;
        if ("https".equalsIgnoreCase(scheme) || "tg".equalsIgnoreCase(scheme)) intent = new Intent(Intent.ACTION_VIEW, uri);
        else if ("tel".equalsIgnoreCase(scheme)) intent = new Intent(Intent.ACTION_DIAL, uri);
        else if ("mailto".equalsIgnoreCase(scheme)) intent = new Intent(Intent.ACTION_SENDTO, uri);
        else return;
        try { startActivity(intent); } catch (ActivityNotFoundException e) { toast(R.string.external_error); }
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        boolean currentOrigin = trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()));
        if (requestCode == CAMERA_REQUEST && cameraRequest != null) {
            if (currentOrigin && has(Manifest.permission.CAMERA)) cameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else { cameraRequest.deny(); toast(R.string.camera_denied); }
            cameraRequest = null;
        }
        if (requestCode == LOCATION_REQUEST && locationCallback != null) {
            boolean allowed = currentOrigin && (has(Manifest.permission.ACCESS_FINE_LOCATION) || has(Manifest.permission.ACCESS_COARSE_LOCATION));
            locationCallback.invoke(locationOrigin, allowed, false);
            if (!allowed) toast(R.string.location_denied);
            locationCallback = null; locationOrigin = null;
        }
    }
    private void revokePendingPermissions() {
        if (cameraRequest != null) { cameraRequest.deny(); cameraRequest = null; }
        if (locationCallback != null) { locationCallback.invoke(locationOrigin, false, false); locationCallback = null; locationOrigin = null; }
    }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override protected void onPause() { CookieManager.getInstance().flush(); web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() { revokePendingPermissions(); web.stopLoading(); web.destroy(); super.onDestroy(); }
}
